import type { Work, WorkType } from "../content/types";

/** The categories in menu order, with the label shown on the home page. */
const CATEGORIES: ReadonlyArray<{ key: WorkType; label: string }> = [
  { key: "cerpen", label: "cerpen" },
  { key: "novela", label: "novela" },
  { key: "bersiri", label: "bersiri" },
  { key: "fragmen", label: "fragmen" },
  { key: "sinopsis", label: "sinopsis" }
];

export type SiteStats = Record<WorkType, number>;

export interface StatItem {
  key: WorkType;
  value: string;
  count: number;
  label: string;
  href: string;
}

/**
 * How many published entries each category holds. A series counts once (the number of published series), never once per episode,
 * so the Bersiri figure is the same one a reader sees on the Bersiri page.
 */
export function computeSiteStats(works: Array<Pick<Work, "type">>, publishedSeriesCount: number): SiteStats {
  const stats: SiteStats = { cerpen: 0, novela: 0, bersiri: publishedSeriesCount, fragmen: 0, sinopsis: 0 };
  for (const work of works) {
    if (work.type !== "bersiri") stats[work.type] += 1;
  }
  return stats;
}

const number = new Intl.NumberFormat("ms-MY");

/** The tiles in menu order; a category with nothing published is left out so the home page never shows "0 fragmen". */
export function statItems(stats: SiteStats): StatItem[] {
  return CATEGORIES.filter((c) => stats[c.key] > 0).map((c) => ({
    key: c.key,
    value: number.format(stats[c.key]),
    count: stats[c.key],
    label: c.label,
    href: `/kategori/${c.key}`
  }));
}
