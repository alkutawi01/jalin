/**
 * "Bacaan saya": the works a signed-in reader has opened, newest first, with the chapter last open. One row per work (the table's key),
 * so reading on only moves the place. Nothing here is shown to anyone but the reader.
 */
import type { Db } from "./service";

export type ReadingRow = { workId: string; sectionSlug: string | null; updatedAt: Date };

const SECTION = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** Remember where the reader is in a work (by its slug). Returns false when the work does not exist or the chapter name is not a slug. */
export async function recordProgress(db: Db, accountId: string, workSlug: string, sectionSlug: string | null, now: Date = new Date()): Promise<boolean> {
  // The page names the work by its public address; the internal id never leaves the server.
  if (!/^[a-z0-9][a-z0-9-]{0,159}$/.test(workSlug)) return false;
  if (sectionSlug !== null && !SECTION.test(sectionSlug)) return false;
  const work = await db.selectFrom("works").select("id").where("slug", "=", workSlug).where("status", "=", "published").executeTakeFirst();
  if (!work) return false;
  await db
    .insertInto("reading_progress")
    .values({ account_id: accountId, work_id: work.id, section_slug: sectionSlug, updated_at: now })
    .onConflict((oc) => oc.columns(["account_id", "work_id"]).doUpdateSet({ section_slug: sectionSlug, updated_at: now }))
    .execute();
  return true;
}

export async function listReading(db: Db, accountId: string, limit = 30): Promise<ReadingRow[]> {
  const rows = await db
    .selectFrom("reading_progress")
    .select(["work_id", "section_slug", "updated_at"])
    .where("account_id", "=", accountId)
    .orderBy("updated_at", "desc")
    .limit(Math.min(100, Math.max(1, limit)))
    .execute();
  return rows.map((r) => ({ workId: r.work_id, sectionSlug: r.section_slug, updatedAt: r.updated_at }));
}

/** Clear the list (the reader's own choice). */
export async function clearReading(db: Db, accountId: string): Promise<void> {
  await db.deleteFrom("reading_progress").where("account_id", "=", accountId).execute();
}
