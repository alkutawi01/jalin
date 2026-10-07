import { getDb, hasDb } from "../db";
import type { ImageCrop, Work } from "../content/types";
import { projectPublicWorkSummary, type PublicWorkSummary } from "./public-projection";

const EDITOR_PICK_LIMIT = 3;

function isDatabaseMode(): boolean {
  return hasDb() && process.env.CONTENT_SOURCE === "database";
}

export function selectPublishedEditorPicks(ids: string[], publishedWorks: Work[]): PublicWorkSummary[] {
  const byId = new Map(publishedWorks.map((work) => [work.id, work]));
  return ids
    .map((id) => byId.get(id))
    .filter((work): work is Work => Boolean(work))
    .slice(0, EDITOR_PICK_LIMIT)
    .map(projectPublicWorkSummary);
}

/**
 * Curation flags/ranks are live. Card content must come from the public
 * repository's published revision, never the mutable editorial work row.
 */
export async function getEditorPickSummaries(publishedWorks: Work[]): Promise<PublicWorkSummary[]> {
  if (!isDatabaseMode()) return [];

  const db = getDb();

  const rows = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .where("editor_pick", "=", true)
    .select(["id", "editor_pick_rank", "updated_at"])
    .execute();

  rows.sort((a, b) => {
    const rankA = a.editor_pick_rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.editor_pick_rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dateB - dateA;
  });

  return selectPublishedEditorPicks(rows.map((row) => String(row.id)), publishedWorks);
}

/** What the home carousel needs from a pick: a single work, or the series an episode belongs to. */
export interface HeroPick {
  slug: string;
  type: PublicWorkSummary["type"];
  title: string;
  genre?: string;
  dek?: string;
  attribution?: string;
  readingMinutes?: number;
  publishedAt?: string;
  hero?: PublicWorkSummary["hero"];
}

export interface SeriesOfEpisode {
  slug: string;
  title: string;
  dek?: string;
  genre?: string;
  hero?: { src: string; alt: string; crop?: ImageCrop };
}

/**
 * A series episode has no address of its own (an episode is reached through its series), so a pick that is an episode is shown as
 * its series: the series title, dek and artwork, linking to the series page. Two episodes of one series are one slide (the first
 * wins). An episode that belongs to no published series cannot be linked to, so it is left out.
 */
export function resolveHeroPicks(picks: PublicWorkSummary[], seriesOfEpisode: (episodeSlug: string) => SeriesOfEpisode | undefined): HeroPick[] {
  const out: HeroPick[] = [];
  const seenSeries = new Set<string>();
  for (const pick of picks) {
    if (pick.type !== "bersiri") {
      out.push({
        slug: pick.slug,
        type: pick.type,
        title: pick.title,
        genre: pick.genre,
        dek: pick.dek,
        attribution: pick.attribution?.primary,
        readingMinutes: pick.readingMinutes,
        publishedAt: pick.publishedAt,
        hero: pick.hero
      });
      continue;
    }
    const series = seriesOfEpisode(pick.slug);
    if (!series || seenSeries.has(series.slug)) continue;
    seenSeries.add(series.slug);
    out.push({
      slug: series.slug,
      type: "bersiri",
      title: series.title,
      genre: series.genre ?? pick.genre,
      dek: series.dek ?? pick.dek,
      attribution: pick.attribution?.primary,
      // The slide shows the picked episode's reading time (a series has no single length).
      readingMinutes: pick.readingMinutes,
      publishedAt: pick.publishedAt,
      // The series' own artwork when it has one, else the episode's picture.
      hero: series.hero ? { src: series.hero.src, alt: series.hero.alt, ...(series.hero.crop ? { crop: series.hero.crop } : {}) } : pick.hero
    });
  }
  return out;
}

/** The series that have more than one of the picked episodes (two picks of one series would show as one slide). */
export function seriesPickedTwice(entries: { seriesId: string; workId: string }[], pickedIds: string[]): string[] {
  const picked = new Set(pickedIds);
  const count = new Map<string, number>();
  for (const entry of entries) if (picked.has(entry.workId)) count.set(entry.seriesId, (count.get(entry.seriesId) ?? 0) + 1);
  return [...count].filter(([, n]) => n > 1).map(([id]) => id);
}
