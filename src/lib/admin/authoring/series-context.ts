/** Loads the series details the prompt needs when an episode continues an existing series. */

import { getDb, hasDb } from "../../db";
import type { SeriesContext } from "./compose-prompt";

export interface SeriesOption {
  id: string;
  title: string;
  mode: string;
  episodes: number;
}

export async function listSeriesOptions(): Promise<SeriesOption[]> {
  if (!hasDb()) return [];
  const db = getDb();
  const rows = await db.selectFrom("series").select(["id", "title", "mode"]).orderBy("title", "asc").execute();
  const counts = await db
    .selectFrom("series_entries")
    .select(["series_id", (eb) => eb.fn.countAll().as("n")])
    .groupBy("series_id")
    .execute();
  const byId = new Map(counts.map((c) => [c.series_id, Number(c.n)]));
  return rows.map((r) => ({ id: r.id, title: r.title, mode: r.mode, episodes: byId.get(r.id) ?? 0 }));
}

export async function loadSeriesContext(seriesId: string): Promise<SeriesContext | null> {
  if (!hasDb()) return null;
  const db = getDb();
  const series = await db.selectFrom("series").where("id", "=", seriesId).select(["title", "mode"]).executeTakeFirst();
  if (!series) return null;
  const episodes = await db
    .selectFrom("series_entries")
    .innerJoin("works", "works.id", "series_entries.work_id")
    .where("series_entries.series_id", "=", seriesId)
    .orderBy("series_entries.position", "asc")
    .select("works.title")
    .execute();
  return { kind: "sambung", title: series.title, mode: series.mode, previousEpisodes: episodes.map((e) => e.title) };
}
