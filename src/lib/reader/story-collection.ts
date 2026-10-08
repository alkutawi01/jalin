import { initContentRepository } from "../content";
import { getAllWorks } from "../content/workLoader";
import type { ImageCrop, SeriesMeta } from "../content/types";
import { displayableGenre } from "./genre-display";
import { getEditorPickSummaries } from "./editor-picks";
import { projectPublicWorkSummary, type PublicWorkSummary } from "./public-projection";
import type { CardAttribution } from "./card-attribution";

/** How many stories the homepage "Koleksi cerita" shows at a time. */
export const COLLECTION_SIZE = 6;

export const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

export function workEyebrow(work: Pick<PublicWorkSummary, "type" | "genre">): string {
  const type = TYPE_LABELS[work.type] ?? work.type;
  const genre = displayableGenre(work.genre);
  return genre ? `${type} · ${genre}` : type;
}

/** What one card needs, as plain data (it is sent to the browser when the reader asks for other stories). */
export interface StoryCard {
  /** The address of the card; also what the browser reports back as "already on screen". */
  key: string;
  href: string;
  type: string;
  eyebrow: string;
  /** "Episod 2: Duit Dapur Setiap Isnin" for a series episode, the plain title for any other work. */
  title: string;
  /** Only for a series episode: the series it comes from (shown as "Daripada ..."). */
  seriesTitle?: string;
  dek?: string;
  readingMinutes?: number;
  publishedAt?: string;
  year: string;
  hero?: { src: string; alt: string; crop?: ImageCrop };
  attribution?: CardAttribution;
}

export function episodeTitle(position: number, title: string): string {
  return `Episod ${position}: ${title}`;
}

/** Every published work a reader can open from the collection: single works and series episodes, minus the editor's hero picks. */
export async function buildStoryPool(): Promise<StoryCard[]> {
  const repo = await initContentRepository();
  const works = repo.source === "database" ? repo.getWorks() : getAllWorks();
  const pickedSlugs = new Set((await getEditorPickSummaries(works)).map((pick) => pick.slug));

  // An episode is reached through its series (the flat episode address does not exist).
  const episodeInfo = new Map<string, { series: SeriesMeta; position: number }>();
  for (const series of repo.getPublishedSeries()) {
    for (const episode of repo.getPublishedSeriesEpisodes(series.id)) {
      episodeInfo.set(episode.slug, { series, position: episode.position });
    }
  }

  const cards: StoryCard[] = [];
  for (const work of works) {
    if (pickedSlugs.has(work.slug)) continue;
    const summary = projectPublicWorkSummary(work);
    const base = {
      type: summary.type,
      eyebrow: workEyebrow(summary),
      ...(summary.dek ? { dek: summary.dek } : {}),
      ...(summary.readingMinutes ? { readingMinutes: summary.readingMinutes } : {}),
      ...(summary.publishedAt ? { publishedAt: summary.publishedAt } : {}),
      year: (summary.updatedAt ?? summary.publishedAt ?? "2026").slice(0, 4),
      ...(summary.hero ? { hero: summary.hero } : {}),
      ...(summary.attribution ? { attribution: summary.attribution } : {})
    };
    if (work.type === "bersiri") {
      const info = episodeInfo.get(work.slug);
      if (!info) continue;
      const href = `/kategori/bersiri/${info.series.slug}/${work.slug}`;
      cards.push({ ...base, key: href, href, title: episodeTitle(info.position, summary.title), seriesTitle: info.series.title });
    } else {
      const href = `/kategori/${work.type}/${work.slug}`;
      cards.push({ ...base, key: href, href, title: summary.title });
    }
  }
  return cards;
}

/** Fisher-Yates; `random` is injectable so the order can be tested. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * A random set of cards. Cards in `onScreen` are left out so a click always changes the set; only when the pool has
 * too few other cards are the ones on screen used to fill the set.
 */
export function pickCollection(pool: readonly StoryCard[], onScreen: ReadonlySet<string> = new Set(), size: number = COLLECTION_SIZE, random: () => number = Math.random): StoryCard[] {
  const fresh = shuffled(pool.filter((card) => !onScreen.has(card.key)), random);
  if (fresh.length >= size) return fresh.slice(0, size);
  const filler = shuffled(pool.filter((card) => onScreen.has(card.key)), random);
  return [...fresh, ...filler].slice(0, size);
}
