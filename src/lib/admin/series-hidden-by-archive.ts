import { getDb } from "../db";

/**
 * In a continuous series readers see the published episodes only as an unbroken run from episode 1 (the series list stops at the first one
 * that is not published). Archiving an episode in the middle therefore hides every published episode after it from the series page and
 * its navigation. This names them so the editor can be asked before it happens. An anthology hides nothing but the episode itself.
 */
export async function episodesHiddenByArchiving(workId: string): Promise<Array<{ title: string; series: string }>> {
  const db = getDb();
  const mine = await db
    .selectFrom("series_entries")
    .innerJoin("series", "series.id", "series_entries.series_id")
    .where("series_entries.work_id", "=", workId)
    .where("series.mode", "=", "continuous")
    .select(["series_entries.series_id as seriesId", "series_entries.position as position", "series.title as seriesTitle"])
    .execute();
  const hidden: Array<{ title: string; series: string }> = [];
  for (const entry of mine) {
    const later = await db
      .selectFrom("series_entries")
      .innerJoin("works", "works.id", "series_entries.work_id")
      .where("series_entries.series_id", "=", entry.seriesId)
      .where("series_entries.position", ">", entry.position)
      .where("works.status", "=", "published")
      .orderBy("series_entries.position")
      .select(["works.title as title"])
      .execute();
    for (const row of later) hidden.push({ title: String(row.title), series: String(entry.seriesTitle) });
  }
  return hidden;
}
