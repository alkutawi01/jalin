/**
 * Explicit publication service.
 *
 * Publication is a separate, human-controlled, admin-only action.
 * - Never auto-generates, auto-approves, auto-attaches, or auto-edits content.
 * - Atomic: status/published_at/published_by/history update in one transaction.
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

export interface PublishWorkResult {
  /** True when Work was already published (idempotent short-circuit). */
  alreadyPublished: boolean;
  workId: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  publishedBy: string | null;
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
  workId: string
) {
  const work = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .selectAll()
    .executeTakeFirst();
  if (!work) return null;

  const [credits, visuals, glossary, visualRequests, contributors, slugDup] =
    await Promise.all([
      db.selectFrom("credits").where("work_id", "=", workId).selectAll().execute(),
      db.selectFrom("visuals").where("work_id", "=", workId).selectAll().execute(),
      db.selectFrom("glossary_terms").where("work_id", "=", workId).selectAll().execute(),
      db.selectFrom("visual_requests").where("work_id", "=", workId).selectAll().execute(),
      db.selectFrom("contributors").select("slug").execute(),
      db
        .selectFrom("works")
        .where("slug", "=", work.slug)
        .where("id", "!=", workId)
        .select("id")
        .executeTakeFirst(),
    ]);

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
    knownContributorSlugs: new Set(contributors.map((c) => String(c.slug))),
    slugTakenByOther: Boolean(slugDup),
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
 * Throws if readiness has blockers or status is not publishable.
 */
export async function publishWorkExplicit(
  workId: string,
  actor: PublishActor
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

  // Idempotent path: already published → no state change.
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

  const input = await loadReadinessInput(db, workId);
  if (!input) throw new Error("Work tidak ditemui.");
  const readiness = evaluatePublicationReadinessFromData(input);
  if (!readiness.ready) {
    const summary = readiness.blockers.map((b) => b.message).join(" | ");
    throw new Error(`Publication readiness gagal: ${summary}`);
  }
  if (existing.status !== "ready") {
    throw new Error(
      `Status mestilah "ready" untuk menerbitkan (sekarang: "${existing.status}").`
    );
  }

  const publishedBy = actor.email || actor.id;
  const nowIso = new Date().toISOString();

  const result = await db.transaction().execute(async (trx) => {
    // Re-check status inside the transaction (concurrency guard).
    const fresh = await trx
      .selectFrom("works")
      .where("id", "=", workId)
      .select(["id", "slug", "status", "published_at", "editorial_history"])
      .executeTakeFirst();
    if (!fresh) throw new Error("Work tidak ditemui semasa transaksi.");
    if (fresh.status === "published") {
      return { alreadyPublished: true as const, fresh };
    }
    if (fresh.status !== "ready") {
      throw new Error(
        `Status berubah semasa transaksi (sekarang: "${fresh.status}").`
      );
    }

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

    return { alreadyPublished: false as const, fresh };
  });

  const finalRow = await db
    .selectFrom("works")
    .where("id", "=", workId)
    .selectAll()
    .executeTakeFirstOrThrow();

  const publishedAt =
    finalRow.published_at instanceof Date
      ? finalRow.published_at.toISOString()
      : finalRow.published_at;

  return {
    alreadyPublished: result.alreadyPublished,
    workId: String(finalRow.id),
    slug: String(finalRow.slug),
    status: String(finalRow.status),
    publishedAt: publishedAt ?? null,
    publishedBy: finalRow.published_by ?? null,
    readiness,
  };
}
