/**
 * Promotion Service — atomic submission-to-Work promotion.
 *
 * Creates a canonical Work, approved credits, and links back to the submission.
 * All within a single transaction — rollback on any failure.
 *
 * Does NOT auto-publish. Does NOT auto-promote. Does NOT generate visuals.
 */

import type { Kysely } from "kysely";
import type { Database, WorkType, WorkStatus } from "../db/types";
import { generateWorkId, slugExists } from "./work-id";

export interface PromotionCreditConfig {
  /** Submission contribution ID */
  contributionId: number;
  /** Include this credit in the final Work? */
  include: boolean;
  /** Final role key for the Work credit */
  roleKey?: string;
  /** Final role label for the Work credit */
  roleLabel: string;
  /** Is this credit public? */
  isPublic: boolean;
  /** Show in byline? */
  byline: boolean;
  /** Sort order */
  sortOrder: number;
  /** Contributor slug (for existing contributors) */
  contributorSlug?: string;
  /** Guest display name (for AI personas or unregistered contributors) */
  guestName?: string;
}

export interface PromotionOptions {
  submissionId: number;
  /** Override slug (auto-generated from title if not provided) */
  slug?: string;
  /** Override Work status (default: "ready") */
  status?: WorkStatus;
  /** Credit configuration — which credits to include and how */
  credits: PromotionCreditConfig[];
  /** Who is performing the promotion */
  promotedBy?: string;
}

export interface PromotionResult {
  workId: string;
  slug: string;
  status: WorkStatus;
  promotedCreditCount: number;
  warnings: string[];
}

/**
 * Validate promotion eligibility.
 * Returns error messages if not eligible.
 */
export function validatePromotionEligibility(submission: {
  status: string;
  proposed_type: string | null;
  proposed_title: string | null;
  proposed_slug: string | null;
  manuscript: string | null;
  result_work_id: string | null;
}): string[] {
  const errors: string[] = [];

  if (submission.status !== "approved") {
    errors.push(`Submission status mestilah "approved" (sekarang: "${submission.status}").`);
  }
  if (!submission.proposed_type) {
    errors.push("Jenis karya diperlukan.");
  }
  if (!submission.proposed_title?.trim()) {
    errors.push("Tajuk diperlukan.");
  }
  if (!submission.proposed_slug?.trim()) {
    errors.push("Slug diperlukan.");
  }
  if (!submission.manuscript?.trim()) {
    errors.push("Manuskrip/body diperlukan.");
  }
  if (submission.result_work_id) {
    errors.push(`Submission ini sudah dipromosikan ke Work ${submission.result_work_id}.`);
  }

  return errors;
}

/**
 * Generate a slug from a title if not provided.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Promote a submission to a canonical Work.
 *
 * Transaction flow:
 * 1. Validate submission eligibility
 * 2. Check slug uniqueness
 * 3. Generate Work ID
 * 4. Create Work record
 * 5. Create approved credits (only included ones)
 * 6. Update submission with resulting_work_id and promoted_at
 * 7. Return result
 *
 * On any failure: ROLLBACK everything. No partial Work creation.
 */
export async function promoteSubmissionToWork(
  db: Kysely<Database>,
  options: PromotionOptions
): Promise<PromotionResult> {
  const warnings: string[] = [];

  return db.transaction().execute(async (trx) => {
    // 1. Load submission
    const submission = await trx
      .selectFrom("work_submissions")
      .where("id", "=", options.submissionId)
      .selectAll()
      .executeTakeFirst();

    if (!submission) {
      throw new Error(`Submission #${options.submissionId} tidak ditemui.`);
    }

    // 2. Validate eligibility
    const eligibilityErrors = validatePromotionEligibility(submission);
    if (eligibilityErrors.length > 0) {
      throw new Error(`Submission tidak layak dipromosikan:\n${eligibilityErrors.join("\n")}`);
    }

    // 3. Determine slug
    const workType = submission.proposed_type as WorkType;
    let slug = options.slug || submission.proposed_slug || generateSlug(submission.proposed_title!);

    // Check slug uniqueness
    if (await slugExists(trx, slug)) {
      // Try appending type prefix
      const typeSlug = `${slug}-${workType}`;
      if (await slugExists(trx, typeSlug)) {
        throw new Error(`Slug "${slug}" dan "${typeSlug}" sudah wujud. Sila pilih slug lain.`);
      }
      slug = typeSlug;
      warnings.push(`Slug "${submission.proposed_slug}" sudah wujud. Menggunakan "${slug}".`);
    }

    // 4. Generate Work ID
    const workId = await generateWorkId(trx, workType);

    // 5. Create Work
    const now = new Date().toISOString();
    const editorialHistory = [
      {
        version: "v1.0",
        type: "promotion",
        summary: `Dipromosikan dari Submission #${submission.id}`,
        date: now,
        submissionId: submission.id,
      },
    ];

    const workStatus: WorkStatus = options.status || "ready";

    await trx
      .insertInto("works")
      .values({
        id: workId,
        slug,
        title: submission.proposed_title!,
        type: workType,
        status: workStatus,
        body: submission.manuscript || "",
        genre: null,
        audience: null,
        dek: submission.dek || null,
        reading_minutes: null,
        version: "v1.0",
        editorial_history: JSON.stringify(editorialHistory),
        published_at: null,
        published_by: null,
        updated_at: now,
        created_at: now,
      } as never)
      .execute();

    // 6. Create approved credits
    let promotedCreditCount = 0;
    const includedCredits = options.credits.filter((c) => c.include);

    for (const creditConfig of includedCredits) {
      // Load the submission contribution to check AI identity
      const contribution = await trx
        .selectFrom("submission_contributions")
        .where("id", "=", creditConfig.contributionId)
        .selectAll()
        .executeTakeFirst();

      if (!contribution) {
        warnings.push(`Sumbangan #${creditConfig.contributionId} tidak ditemui, dilangkau.`);
        continue;
      }

      // Determine final guest name — use AI persona if available
      let finalGuestName = creditConfig.guestName || contribution.guest_name;
      if (contribution.ai_persona && !finalGuestName) {
        finalGuestName = contribution.ai_persona;
      }

      // Enforce XOR: contributor slug or guest name
      if (!creditConfig.contributorSlug && !finalGuestName) {
        warnings.push(`Sumbangan #${creditConfig.contributionId} tiada penyumbang, dilangkau.`);
        continue;
      }

      await trx
        .insertInto("credits")
        .values({
          work_id: workId,
          contributor_slug: creditConfig.contributorSlug || null,
          guest_name: finalGuestName || null,
          role_label: creditConfig.roleLabel || contribution.role_label,
          byline: creditConfig.byline,
          is_public: creditConfig.isPublic,
          sort_order: creditConfig.sortOrder,
          created_at: now,
        })
        .execute();

      promotedCreditCount++;
    }

    // 7. Update submission with resulting_work_id and promoted_at
    await trx
      .updateTable("work_submissions")
      .set({
        result_work_id: workId,
        promoted_at: now,
        updated_at: now,
      })
      .where("id", "=", options.submissionId)
      .execute();

    return {
      workId,
      slug,
      status: workStatus,
      promotedCreditCount,
      warnings,
    };
  });
}

/**
 * Check if a submission has already been promoted.
 */
export async function isSubmissionPromoted(
  db: Kysely<Database>,
  submissionId: number
): Promise<boolean> {
  const submission = await db
    .selectFrom("work_submissions")
    .where("id", "=", submissionId)
    .select("result_work_id")
    .executeTakeFirst();

  return !!submission?.result_work_id;
}
