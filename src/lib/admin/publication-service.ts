/**
 * Explicit publication service.
 *
 * Publication is a separate, human-controlled, admin-only action.
 * - Never auto-generates, auto-approves, auto-attaches, or auto-edits content.
 * - Atomic: readiness recheck + status/published_at/published_by/history in ONE transaction.
 * - Authoritative readiness comes from the transactional recheck (preflight is advisory only).
 * - SERIALIZABLE isolation + row locks (FOR UPDATE/FOR SHARE) + bounded retry (SQLSTATE 40001/40P01)
 *   closes concurrent-mutation races (SERIALIZABLE alone does not abort this rw pattern).
 * - Idempotent: publishing an already-published Work is a safe no-op.
 */

import type { Kysely, Transaction } from "kysely";
import type { Database } from "../db/types";
import { getDb, hasDb } from "../db";
import {
  evaluatePublicationReadinessFromData,
  type PublicationReadiness,
} from "./publication-readiness";

export interface PublishActor {
  id: string;
  email?: string;
}

export interface PublishWorkOptions {
  /**
   * Test-only hook: runs after preflight PASS and before the publish transaction
   * begins. Used by race-condition regression tests to invalidate a relation.
   */
  beforeTransaction?: () => Promise<void> | void;
  /**
   * Test-only hook: runs inside the publish transaction AFTER authoritative
   * readiness recheck and BEFORE the publish UPDATE. Used to simulate a
   * concurrent writer committing mid-transaction under SERIALIZABLE.
   */
  insideTransactionAfterReadiness?: () => Promise<void> | void;
}

/** Bounded retries for SERIALIZABLE conflicts (SQLSTATE 40001 / 40P01). Never infinite. */
export const PUBLISH_SERIALIZABLE_RETRY_MAX = 3;

/** Detect PostgreSQL serialization/deadlock failures eligible for bounded retry. */
export function isPublicationSerializationFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (code === "40001" || code === "40P01") return true;
  const message = typeof e.message === "string" ? e.message : "";
  return (
    message.includes("could not serialize access") ||
    message.includes("SQLSTATE 40001") ||
    message.includes("deadlock detected")
  );
}

export interface PublishWorkResult {
  /** True when Work was already published (idempotent short-circuit). */
  alreadyPublished: boolean;
  workId: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  publishedBy: string | null;
  /** Authoritative readiness from the successful transaction (or read-only idempotent path). */
  readiness: PublicationReadiness;
}

function getDbOrThrow(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[PublicationService] Database not available.");
  }
  return getDb();
}

async function loadReadinessInput(
  db: Kysely<Database> | Transaction<Database>,
  workId: string,
  options: { lock?: boolean } = {}
) {
  const lock = options.lock === true;
  const worksQ = db.selectFrom("works").where("id", "=", workId).selectAll();
  const work = await (lock ? worksQ.forUpdate() : worksQ).executeTakeFirst();
  if (!work) return null;

  const creditsQ = db.selectFrom("credits").where("work_id", "=", workId).selectAll();
  const visualsQ = db.selectFrom("visuals").where("work_id", "=", workId).selectAll();
  const glossaryQ = db.selectFrom("glossary_terms").where("work_id", "=", workId).selectAll();
  const vrQ = db.selectFrom("visual_requests").where("work_id", "=", workId).selectAll();
  const srcQ = db.selectFrom("source_works").where("work_id", "=", workId).selectAll();
  const sectionsQ = db.selectFrom("reading_sections").where("work_id", "=", workId).selectAll().orderBy("position", "asc");
  const seriesEntryQ = db.selectFrom("series_entries").where("work_id", "=", workId).selectAll().orderBy("position", "asc");
  const slugQ = db
    .selectFrom("works")
    .where("slug", "=", work.slug)
    .where("id", "!=", workId)
    .select("id");

  const [credits, visuals, glossary, visualRequests, sourceWork, readingSections, seriesEntryRows, slugDup] = await Promise.all([
    (lock ? creditsQ.forUpdate() : creditsQ).execute(),
    (lock ? visualsQ.forUpdate() : visualsQ).execute(),
    (lock ? glossaryQ.forUpdate() : glossaryQ).execute(),
    (lock ? vrQ.forUpdate() : vrQ).execute(),
    (lock ? srcQ.forUpdate() : srcQ).executeTakeFirst(),
    (lock ? sectionsQ.forUpdate() : sectionsQ).execute(),
    (lock ? seriesEntryQ.forUpdate() : seriesEntryQ).execute(),
    (lock ? slugQ.forUpdate() : slugQ).executeTakeFirst(),
  ]);

  const seriesEntry = seriesEntryRows.length > 0 ? seriesEntryRows[0] : null;
  let series: Awaited<ReturnType<typeof loadSeriesRow>> = null;
  if (seriesEntry) {
    series = await loadSeriesRow(db, String(seriesEntry.series_id), lock);
  }

  // Lock only contributors referenced by this Work's credits (FOR SHARE blocks delete).
  const referencedSlugs = [
    ...new Set(
      credits
        .map((c) => (c.contributor_slug ? String(c.contributor_slug) : null))
        .filter((s): s is string => Boolean(s))
    ),
  ];
  let contributors: { slug: string }[];
  if (referencedSlugs.length === 0) {
    contributors = [];
  } else {
    const contribQ = db
      .selectFrom("contributors")
      .select("slug")
      .where("slug", "in", referencedSlugs);
    contributors = lock
      ? await contribQ.forShare().execute()
      : await contribQ.execute();
  }

  return {
    work: {
      id: String(work.id),
      slug: String(work.slug),
      title: String(work.title ?? ""),
      type: String(work.type),
      status: String(work.status),
      body: work.body ?? null,
      dek: work.dek ?? null,
      genre: work.genre ?? null,
      audience: work.audience ?? null,
      version: String(work.version ?? ""),
      published_at:
        work.published_at instanceof Date
          ? work.published_at.toISOString()
          : work.published_at,
      editorial_history: work.editorial_history,
    },
    credits,
    visuals,
    glossary,
    visualRequests,
    sourceWork: sourceWork
      ? {
          original_title: sourceWork.original_title,
          author: sourceWork.author,
          original_language: sourceWork.original_language,
          source_edition: sourceWork.source_edition,
          source_url: sourceWork.source_url,
          source_locator: sourceWork.source_locator,
          source_text_basis: sourceWork.source_text_basis,
          rights_status: String(sourceWork.rights_status),
          rights_notes: sourceWork.rights_notes,
          reviewed_at:
            sourceWork.reviewed_at instanceof Date
              ? sourceWork.reviewed_at.toISOString()
              : sourceWork.reviewed_at,
          reviewed_by: sourceWork.reviewed_by,
          approved_material_hash: sourceWork.approved_material_hash,
        }
      : null,
    readingSections: readingSections.map((s) => ({
      id: s.id,
      work_id: String(s.work_id),
      slug: String(s.slug),
      title: s.title,
      position: s.position,
      body: String(s.body ?? ""),
      reading_minutes: s.reading_minutes,
    })),
    seriesEntry: seriesEntry
      ? {
          id: seriesEntry.id,
          series_id: String(seriesEntry.series_id),
          work_id: String(seriesEntry.work_id),
          position: seriesEntry.position,
        }
      : null,
    series,
    knownContributorSlugs: new Set(contributors.map((c) => String(c.slug))),
    slugTakenByOther: Boolean(slugDup),
  };
}

async function loadSeriesRow(
  db: Kysely<Database> | Transaction<Database>,
  seriesId: string,
  lock: boolean
) {
  const q = db.selectFrom("series").where("id", "=", seriesId).selectAll();
  const row = await (lock ? q.forUpdate() : q).executeTakeFirst();
  if (!row) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    mode: String(row.mode),
    status: String(row.status),
  };
}

/** Read-only readiness evaluation against live data. Never mutates. */
export async function evaluatePublicationReadiness(
  workId: string
): Promise<PublicationReadiness | null> {
  const db = getDbOrThrow();
  const input = await loadReadinessInput(db, workId);
  if (!input) return null;
  return evaluatePublicationReadinessFromData(input);
}

/**
 * Explicit publish. Admin-only is enforced by /api/admin route middleware.
 *
 * Preflight readiness is advisory (fast fail / API feedback).
 * Transactional readiness recheck (all relations via trx, SERIALIZABLE + FOR UPDATE locks) is AUTHORITATIVE.
 * Serialization failures retry up to PUBLISH_SERIALIZABLE_RETRY_MAX; readiness failures do not retry.
 * Throws if either evaluation has blockers or status is not publishable.
 */
export async function publishWorkExplicit(
  workId: string,
  actor: PublishActor,
  options: PublishWorkOptions = {}
): Promise<PublishWorkResult> {
  const db = getDbOrThrow();

  const existing = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .selectAll()
    .executeTakeFirst();
  if (!existing) {
    throw new Error("Work tidak ditemui.");
  }

  // Idempotent path: already published → no state change (read-only readiness).
  if (existing.status === "published") {
    const readiness = await evaluatePublicationReadiness(workId);
    if (!readiness) throw new Error("Work tidak ditemui.");
    const publishedAt =
      existing.published_at instanceof Date
        ? existing.published_at.toISOString()
        : existing.published_at;
    return {
      alreadyPublished: true,
      workId: String(existing.id),
      slug: String(existing.slug),
      status: "published",
      publishedAt: publishedAt ?? null,
      publishedBy: existing.published_by ?? null,
      readiness,
    };
  }

  // Preflight (advisory): fast failure before opening a transaction.
  const preflightInput = await loadReadinessInput(db, workId);
  if (!preflightInput) throw new Error("Work tidak ditemui.");
  const preflight = evaluatePublicationReadinessFromData(preflightInput);
  if (!preflight.ready) {
    const summary = preflight.blockers.map((b) => b.message).join(" | ");
    throw new Error(`Publication readiness gagal: ${summary}`);
  }
  if (preflightInput.work.status !== "ready") {
    throw new Error(
      `Status mestilah "ready" untuk menerbitkan (sekarang: "${preflightInput.work.status}").`
    );
  }

  if (options.beforeTransaction) {
    await options.beforeTransaction();
  }

  const publishedBy = actor.email || actor.id;
  const nowIso = new Date().toISOString();

  // SERIALIZABLE + bounded retry: closes READ COMMITTED gap where related
  // rows can change after readiness SELECTs and before the publish UPDATE.
  let result: Awaited<ReturnType<typeof runPublishAttempt>> | null = null;
  let lastSerializationError: unknown = null;

  async function runPublishAttempt() {
    return db
      .transaction()
      .setIsolationLevel("serializable")
      .execute(async (trx) => {
        // Load fresh Work + ALL publication relations via the SAME transaction,
        // with row locks (FOR UPDATE / FOR SHARE) so concurrent writers block
        // until this publish commits or rolls back.
        const input = await loadReadinessInput(trx, workId, { lock: true });
        if (!input) throw new Error("Work tidak ditemui semasa transaksi.");

        if (input.work.status === "published") {
          // Concurrent publish won the race — idempotent success without rewrite.
          const readiness = evaluatePublicationReadinessFromData(input);
          return {
            alreadyPublished: true as const,
            readiness,
            slug: input.work.slug,
            publishedAt: input.work.published_at ?? null,
            publishedBy:
              (
                await trx
                  .selectFrom("works")
                  .where("id", "=", workId)
                  .select("published_by")
                  .executeTakeFirstOrThrow()
              ).published_by ?? null,
          };
        }

        // AUTHORITATIVE transactional readiness recheck (all relations via trx).
        const readiness = evaluatePublicationReadinessFromData(input);
        if (!readiness.ready) {
          const summary = readiness.blockers.map((b) => b.message).join(" | ");
          throw new Error(`Publication readiness (transaksi) gagal: ${summary}`);
        }
        if (input.work.status !== "ready") {
          throw new Error(
            `Status berubah semasa transaksi (sekarang: "${input.work.status}").`
          );
        }

        if (options.insideTransactionAfterReadiness) {
          await options.insideTransactionAfterReadiness();
        }

        const fresh = await trx
          .selectFrom("works")
          .where("id", "=", workId)
          .select(["editorial_history"])
          .executeTakeFirstOrThrow();

        let history: unknown[] = [];
        try {
          const parsed =
            typeof fresh.editorial_history === "string"
              ? JSON.parse(fresh.editorial_history)
              : fresh.editorial_history;
          if (Array.isArray(parsed)) history = parsed;
        } catch {
          history = [];
        }
        history = [
          ...history,
          {
            version: "publish",
            type: "major",
            summary: `Diterbitkan secara eksplisit oleh ${publishedBy}`,
            date: nowIso,
            publishedBy,
          },
        ];

        await trx
          .updateTable("works")
          .where("id", "=", workId)
          .set({
            status: "published",
            published_at: nowIso,
            published_by: publishedBy,
            editorial_history: JSON.stringify(history) as never,
            updated_at: nowIso,
          })
          .execute();

        return {
          alreadyPublished: false as const,
          readiness,
          slug: input.work.slug,
          publishedAt: nowIso,
          publishedBy,
        };
      });
  }

  for (let attempt = 1; attempt <= PUBLISH_SERIALIZABLE_RETRY_MAX; attempt++) {
    try {
      result = await runPublishAttempt();
      break;
    } catch (err) {
      if (
        isPublicationSerializationFailure(err) &&
        attempt < PUBLISH_SERIALIZABLE_RETRY_MAX
      ) {
        // Retry the whole publish transaction; each attempt re-runs readiness.
        lastSerializationError = err;
        continue;
      }
      throw err;
    }
  }
  if (!result) {
    throw lastSerializationError instanceof Error
      ? lastSerializationError
      : new Error("Publish transaction gagal selepas retry berperingkat.");
  }

  return {
    alreadyPublished: result.alreadyPublished,
    workId,
    slug: result.slug,
    status: "published",
    publishedAt: result.publishedAt ?? null,
    publishedBy: result.publishedBy,
    // Authoritative readiness from the successful transactional evaluation.
    readiness: result.readiness,
  };
}
