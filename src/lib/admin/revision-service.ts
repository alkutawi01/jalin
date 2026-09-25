import type { Kysely, Transaction } from "kysely";
import type { Database, WorkRevisions } from "../db/types";
import { getDb, hasDb } from "../db";
import {
  evaluatePublicationReadinessFromData,
  type PublicationReadiness,
} from "./publication-readiness";

export interface RevisionActor {
  id: string;
  email?: string;
}

export interface PublishRevisionOptions {
  changeType?: "major" | "minor" | "patch";
  versionLabel?: string;
  revisionSummary?: string;
}

export interface RevisionResult {
  revisionId: string;
  revisionNo: number;
  publishedAt: string;
  publishedBy: string;
}

function getDbOrThrow(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[RevisionService] Database not available.");
  }
  return getDb();
}

function computeContentHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

async function loadWorkForRevision(
  db: Kysely<Database> | Transaction<Database>,
  workId: string
) {
  const work = await db.selectFrom("works").where("id", "=", workId).selectAll().executeTakeFirst();
  if (!work) return null;

  const credits = await db.selectFrom("credits").where("work_id", "=", workId).selectAll().execute();
  const visuals = await db.selectFrom("visuals").where("work_id", "=", workId).selectAll().execute();
  const glossary = await db.selectFrom("glossary_terms").where("work_id", "=", workId).selectAll().execute();
  const visualRequests = await db.selectFrom("visual_requests").where("work_id", "=", workId).selectAll().execute();
  const sourceWork = await db.selectFrom("source_works").where("work_id", "=", workId).selectAll().executeTakeFirst();
  const readingSections = await db.selectFrom("reading_sections").where("work_id", "=", workId).selectAll().orderBy("position", "asc").execute();
  const seriesEntry = await db.selectFrom("series_entries").where("work_id", "=", workId).selectAll().executeTakeFirst();

  let series = null;
  if (seriesEntry) {
    const s = await db.selectFrom("series").where("id", "=", seriesEntry.series_id).selectAll().executeTakeFirst();
    if (s) {
      series = {
        id: s.id,
        slug: s.slug,
        title: s.title,
        dek: s.dek,
        genre: s.genre,
        audience: s.audience,
        mode: s.mode,
        status: s.status,
      };
    }
  }

  const contributors = await db
    .selectFrom("contributors")
    .where("slug", "in", credits.map((c) => c.contributor_slug).filter(Boolean))
    .select(["slug"])
    .execute();

  return {
    work,
    credits,
    visuals,
    glossary,
    visualRequests,
    sourceWork,
    readingSections,
    series,
    knownContributorSlugs: new Set(contributors.map((c) => c.slug)),
  };
}

function buildSnapshot(input: Awaited<ReturnType<typeof loadWorkForRevision>>) {
  if (!input) return null;

  const snapshot = {
    id: input.work.id,
    slug: input.work.slug,
    title: input.work.title,
    type: input.work.type,
    status: input.work.status,
    genre: input.work.genre,
    audience: input.work.audience,
    dek: input.work.dek,
    readingMinutes: input.work.reading_minutes,
    publishedAt: input.work.published_at,
    updatedAt: input.work.updated_at,
    version: input.work.version,
    versionLabel: input.work.version_label,
    revisionCount: input.work.revision_count,
    publishedBy: input.work.published_by,
    firstPublishedAt: input.work.first_published_at,
    publishedRevisionId: input.work.published_revision_id,
    body: input.work.body,
    credits: input.credits.map((c) => ({
      contributor_slug: c.contributor_slug,
      guest_name: c.guest_name,
      role_label: c.role_label,
      byline: c.byline,
      is_public: c.is_public,
      sort_order: c.sort_order,
    })),
    visuals: input.visuals.map((v) => ({
      role: v.role,
      src: v.src,
      alt: v.alt,
      provider: v.provider,
      creation_id: v.creation_id,
      place: v.place,
      sort_order: v.sort_order,
      is_asset_finalized: v.is_asset_finalized,
    })),
    glossary: input.glossary.map((g) => ({
      term: g.term,
      meaning: g.meaning,
      source: g.source,
      sort_order: g.sort_order,
    })),
    editorialHistory: input.work.editorial_history,
    sourceWork: input.sourceWork
      ? {
          original_title: input.sourceWork.original_title,
          author: input.sourceWork.author,
          original_language: input.sourceWork.original_language,
          source_edition: input.sourceWork.source_edition,
          source_url: input.sourceWork.source_url,
          source_locator: input.sourceWork.source_locator,
          source_text_basis: input.sourceWork.source_text_basis,
          rights_status: input.sourceWork.rights_status,
          rights_notes: input.sourceWork.rights_notes,
          rights_evidence: input.sourceWork.rights_evidence,
          rights_history: input.sourceWork.rights_history,
          reviewed_by: input.sourceWork.reviewed_by,
          reviewed_at: input.sourceWork.reviewed_at,
          approved_material_hash: input.sourceWork.approved_material_hash,
        }
      : null,
    readingSections: input.readingSections.map((s) => ({
      slug: s.slug,
      title: s.title,
      body: s.body,
      position: s.position,
      readingMinutes: s.reading_minutes,
    })),
    // Also store as 'sections' for buildSnapshotWork compatibility
    sections: input.readingSections.map((s) => ({
      slug: s.slug,
      title: s.title,
      body: s.body,
      position: s.position,
      readingMinutes: s.reading_minutes,
    })),
    series: input.series
      ? {
          id: input.series.id,
          slug: input.series.slug,
          title: input.series.title,
          dek: input.series.dek,
          genre: input.series.genre,
          audience: input.series.audience,
          mode: input.series.mode,
          status: input.series.status,
        }
      : null,
  };

  return snapshot;
}

export async function createRevision(
  workId: string,
  actor: RevisionActor,
  options: PublishRevisionOptions = {}
): Promise<RevisionResult> {
  const db = getDbOrThrow();

  return await db.transaction().execute(async (trx) => {
    const work = await trx.selectFrom("works").where("id", "=", workId).selectAll().executeTakeFirst();
    if (!work) throw new Error("Work tidak ditemui.");
    if (work.status !== "published" && work.status !== "ready") {
      throw new Error(`Work status "${work.status}" tidak boleh dipublikasikan.`);
    }

    const input = await loadWorkForRevision(trx, workId);
    const snapshot = buildSnapshot(input);
    if (!snapshot) throw new Error("Gagal membina snapshot.");

    const contentHash = computeContentHash(snapshot);

    // Check if content hash already exists for this work (idempotent)
    const existing = await trx
      .selectFrom("work_revisions")
      .where("work_id", "=", workId)
      .where("content_hash", "=", contentHash)
      .select(["id", "revision_no"])
      .executeTakeFirst();
    if (existing) {
      return {
        revisionId: existing.id,
        revisionNo: existing.revision_no,
        publishedAt: new Date().toISOString(),
        publishedBy: actor.email || actor.id,
      };
    }

    const revisionNo = (work.revision_count ?? 0) + 1;
    const nowIso = new Date().toISOString();
    const publishedBy = actor.email || actor.id;
    const revisionId = `rev_${workId}_${revisionNo}_${Date.now()}`;

    const snapshotWithMeta = {
      ...snapshot,
      version: snapshot.version,
      versionLabel: snapshot.versionLabel,
      revisionCount: snapshot.revisionCount,
      publishedRevisionId: snapshot.publishedRevisionId,
    };

    await trx
      .insertInto("work_revisions")
      .values({
        id: revisionId,
        work_id: workId,
        revision_no: revisionNo,
        version_label: options.versionLabel ?? snapshot.versionLabel ?? `v${revisionNo}`,
        change_type: options.changeType ?? "minor",
        revision_summary: options.revisionSummary ?? null,
        snapshot: JSON.stringify(snapshotWithMeta) as any,
        content_hash: contentHash,
        published_by: publishedBy,
        published_at: nowIso,
        first_published_at: work.first_published_at ?? nowIso,
        created_at: nowIso,
      })
      .execute();

    // Update works table
    await trx
      .updateTable("works")
      .where("id", "=", workId)
      .set({
        published_revision_id: revisionId,
        revision_count: revisionNo,
        version_label: options.versionLabel ?? `v${revisionNo}`,
        published_at: nowIso,
        published_by: publishedBy,
        first_published_at: work.first_published_at ?? nowIso,
        updated_at: nowIso,
      })
      .execute();

    return {
      revisionId,
      revisionNo,
      publishedAt: nowIso,
      publishedBy,
    };
  });
}

export async function getRevisions(workId: string) {
  const db = getDbOrThrow();
  return db
    .selectFrom("work_revisions")
    .where("work_id", "=", workId)
    .selectAll()
    .orderBy("revision_no", "desc")
    .execute();
}

export async function getRevision(revisionId: string) {
  const db = getDbOrThrow();
  return db.selectFrom("work_revisions").where("id", "=", revisionId).selectAll().executeTakeFirst();
}

export async function revertRevision(workId: string, revisionId: string, actor: RevisionActor) {
  const db = getDbOrThrow();

  return await db.transaction().execute(async (trx) => {
    const revision = await trx
      .selectFrom("work_revisions")
      .where("id", "=", revisionId)
      .where("work_id", "=", workId)
      .selectAll()
      .executeTakeFirst();
    if (!revision) throw new Error("Revision tidak ditemui.");

    const snapshot = typeof revision.snapshot === "string" ? JSON.parse(revision.snapshot) : revision.snapshot;
    const nowIso = new Date().toISOString();
    const publishedBy = actor.email || actor.id;

    // Create new revision as revert (NOT overwrite history)
    const revertRevisionNo = (await trx.selectFrom("works").where("id", "=", workId).select("revision_count").executeTakeFirst())!.revision_count + 1;
    const revertRevisionId = `rev_${workId}_${revertRevisionNo}_${Date.now()}`;

    // Revert creates a new revision from the old snapshot and becomes the current published revision
    await trx
      .insertInto("work_revisions")
      .values({
        id: revertRevisionId,
        work_id: workId,
        revision_no: revertRevisionNo,
        version_label: `revert-v${revertRevisionNo}`,
        change_type: "patch",
        revision_summary: `Reverted to revision ${revision.revision_no}`,
        snapshot: revision.snapshot,
        content_hash: revision.content_hash,
        published_by: publishedBy,
        published_at: nowIso,
        first_published_at: revision.first_published_at,
        created_at: nowIso,
      })
      .execute();

    // Update works table - revert becomes the current state
    await trx
      .updateTable("works")
      .where("id", "=", workId)
      .set({
        version: snapshot.version,
        version_label: `revert-v${revertRevisionNo}`,
        revision_count: revertRevisionNo,
        body: snapshot.body,
        dek: snapshot.dek,
        genre: snapshot.genre,
        audience: snapshot.audience,
        reading_minutes: snapshot.readingMinutes,
        published_revision_id: revertRevisionId,
        published_at: nowIso,
        published_by: publishedBy,
        updated_at: nowIso,
      })
      .execute();

    return { revisionId: revertRevisionId, revisionNo: revertRevisionNo };
  });
}

export async function restoreRevision(workId: string, revisionId: string, actor: RevisionActor) {
  const db = getDbOrThrow();

  const revision = await db
    .selectFrom("work_revisions")
    .where("id", "=", revisionId)
    .where("work_id", "=", workId)
    .selectAll()
    .executeTakeFirst();
  if (!revision) throw new Error("Revision tidak ditemui.");

  const snapshot = typeof revision.snapshot === "string" ? JSON.parse(revision.snapshot) : revision.snapshot;
  const nowIso = new Date().toISOString();
  const publishedBy = actor.email || actor.id;

  // Create new revision as restore
  const restoreRevisionNo = (await getDbOrThrow().selectFrom("works").where("id", "=", workId).select("revision_count").executeTakeFirst())!.revision_count + 1;
  const restoreRevisionId = `rev_${workId}_${restoreRevisionNo}_${Date.now()}`;

  await getDbOrThrow()
    .insertInto("work_revisions")
    .values({
      id: restoreRevisionId,
      work_id: workId,
      revision_no: restoreRevisionNo,
      version_label: `restore-v${restoreRevisionNo}`,
      change_type: "patch",
      revision_summary: `Restored from revision ${revision.revision_no}`,
      snapshot: revision.snapshot,
      content_hash: revision.content_hash,
      published_by: publishedBy,
      published_at: nowIso,
      first_published_at: revision.first_published_at,
      created_at: nowIso,
    })
    .execute();

  // Update works table with restored snapshot
  await getDbOrThrow()
    .updateTable("works")
    .where("id", "=", workId)
    .set({
      version: snapshot.version,
      version_label: `restore-v${restoreRevisionNo}`,
      revision_count: restoreRevisionNo,
      body: snapshot.body,
      dek: snapshot.dek,
      genre: snapshot.genre,
      audience: snapshot.audience,
      reading_minutes: snapshot.readingMinutes,
      published_revision_id: restoreRevisionId,
      published_at: nowIso,
      published_by: publishedBy,
      updated_at: nowIso,
    })
    .execute();

  return { revisionId: restoreRevisionId, revisionNo: restoreRevisionNo };
}

export async function getPublishedRevision(workId: string) {
  const db = getDbOrThrow();
  const work = await db.selectFrom("works").where("id", "=", workId).select(["published_revision_id"]).executeTakeFirst();
  if (!work?.published_revision_id) return null;
  return getRevision(work.published_revision_id);
}