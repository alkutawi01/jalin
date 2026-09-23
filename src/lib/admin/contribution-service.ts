/**
 * Admin Submission Contribution Service
 *
 * Database operations for managing submission contributions.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database, IdentitySource } from "../db/types";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[ContributionService] Database not available.");
  }
  return getDb();
}

export interface ContributionInput {
  submissionId: number;
  contributorSlug?: string;
  guestName?: string;
  roleKey?: string;
  roleLabel: string;
  sortOrder: number;
  suggestedPublicCredit?: string;
  aiProvider?: string;
  aiModel?: string;
  aiPersona?: string;
  aiActualRole?: string;
  aiIdentitySource?: string;
}

export interface ContributionRecord {
  id: number;
  submission_id: number;
  contributor_slug: string | null;
  guest_name: string | null;
  role_key: string | null;
  role_label: string;
  sort_order: number;
  suggested_public_credit: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_persona: string | null;
  ai_actual_role: string | null;
  ai_identity_source: string;
  created_at: Date;
}

export async function listContributionsForSubmission(
  submissionId: number
): Promise<ContributionRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("submission_contributions")
    .where("submission_id", "=", submissionId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();
}

export async function getContribution(id: number): Promise<ContributionRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("submission_contributions")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function createContribution(input: ContributionInput): Promise<ContributionRecord> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const result = await db
    .insertInto("submission_contributions")
    .values({
      submission_id: input.submissionId,
      contributor_slug: input.contributorSlug || null,
      guest_name: input.guestName || null,
      role_key: input.roleKey || null,
      role_label: input.roleLabel,
      sort_order: input.sortOrder,
      suggested_public_credit: input.suggestedPublicCredit || null,
      ai_provider: input.aiProvider || null,
      ai_model: input.aiModel || null,
      ai_persona: input.aiPersona || null,
      ai_actual_role: input.aiActualRole || null,
      ai_identity_source: (input.aiIdentitySource || "unknown") as IdentitySource,
      created_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Gagal mencipta sumbangan.");
  }

  const contribution = await getContribution(result.id);
  if (!contribution) {
    throw new Error("Sumbangan tidak ditemui selepas penciptaan.");
  }

  return contribution;
}

export async function updateContribution(
  id: number,
  input: Partial<ContributionInput>
): Promise<ContributionRecord> {
  const db = getAdminDb();
  const updateData: Record<string, unknown> = {};

  if (input.contributorSlug !== undefined) updateData.contributor_slug = input.contributorSlug || null;
  if (input.guestName !== undefined) updateData.guest_name = input.guestName || null;
  if (input.roleKey !== undefined) updateData.role_key = input.roleKey || null;
  if (input.roleLabel !== undefined) updateData.role_label = input.roleLabel;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
  if (input.suggestedPublicCredit !== undefined) updateData.suggested_public_credit = input.suggestedPublicCredit || null;
  if (input.aiProvider !== undefined) updateData.ai_provider = input.aiProvider || null;
  if (input.aiModel !== undefined) updateData.ai_model = input.aiModel || null;
  if (input.aiPersona !== undefined) updateData.ai_persona = input.aiPersona || null;
  if (input.aiActualRole !== undefined) updateData.ai_actual_role = input.aiActualRole || null;
  if (input.aiIdentitySource !== undefined) updateData.ai_identity_source = input.aiIdentitySource;

  await db
    .updateTable("submission_contributions")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const contribution = await getContribution(id);
  if (!contribution) {
    throw new Error("Sumbangan tidak ditemui selepas kemas kini.");
  }

  return contribution;
}

export async function deleteContribution(id: number): Promise<void> {
  const db = getAdminDb();
  await db
    .deleteFrom("submission_contributions")
    .where("id", "=", id)
    .execute();
}
