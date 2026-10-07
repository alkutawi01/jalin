import type { MetadataRoute } from "next";
import { isAuthorAlias } from "../lib/reader/author-alias";
import { SITE_URL } from "../lib/seo";
import { initContentRepository } from "../lib/content";
import { getAllWorks } from "../lib/content/workLoader";
import type { WorkType } from "../lib/content/types";
import { getDb, hasDb } from "../lib/db";

// Read on every request, like the pages it lists: a work published after the last deploy must be in the sitemap at once.
export const dynamic = "force-dynamic";

const CATEGORY_TYPES: WorkType[] = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];
const CONTRIBUTOR_SLUGS = ["nara-zahin", "rafiq-naim"];

/** The public contributor pages: the visible contributors of the database (what bylines link to), else the two static profiles. */
async function contributorSlugs(): Promise<string[]> {
  if (process.env.CONTENT_SOURCE === "database" && hasDb()) {
    try {
      const rows = await getDb().selectFrom("contributors").select("slug").where("is_visible", "=", true).orderBy("slug").execute();
      // An older pen-name address is not listed beside the editor's record it shows (one page for one author).
      if (rows.length > 0) return rows.map((row) => row.slug).filter((slug) => !isAuthorAlias(slug));
    } catch {
      /* fall back to the static list */
    }
  }
  return CONTRIBUTOR_SLUGS;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = await initContentRepository();
  const contributors = await contributorSlugs();
  const works = repo.source === "database" ? repo.getWorks() : getAllWorks();

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...CATEGORY_TYPES.map((type) => ({
      url: `${SITE_URL}/kategori/${type}`,
      changeFrequency: "daily" as const,
      priority: 0.7
    })),
    ...["tentang", "privasi", "terma"].map((page) => ({
      url: `${SITE_URL}/${page}`,
      changeFrequency: "yearly" as const,
      priority: 0.3
    })),
    ...contributors.map((slug) => ({
      url: `${SITE_URL}/penulis/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4
    }))
  ];

  for (const work of works) {
    if (work.type === "bersiri") continue; // owns nested series routes
    entries.push({
      url: `${SITE_URL}/kategori/${work.type}/${work.slug}`,
      lastModified: work.updatedAt ?? work.publishedAt,
      changeFrequency: "weekly",
      priority: 0.6
    });
    if (work.type === "novela" && work.sections && work.sections.length > 0) {
      for (const section of work.sections) {
        entries.push({
          url: `${SITE_URL}/kategori/novela/${work.slug}/${section.slug}`,
          lastModified: work.updatedAt ?? work.publishedAt,
          changeFrequency: "weekly",
          priority: 0.5
        });
      }
    }
  }

  const seriesList = repo.getPublishedSeries();
  for (const series of seriesList) {
    // Every other page in the sitemap says when it last changed; a series and its episodes did not. An episode's date is its work's
    // (as for a cerpen), and the series' is the latest of its episodes'.
    const episodeEntries = repo.getPublishedSeriesEpisodes(series.id).map((episode) => ({
      url: `${SITE_URL}/kategori/bersiri/${series.slug}/${episode.slug}`,
      lastModified: repo.getEpisodeBySeriesAndSlug(series.slug, episode.slug)?.updatedAt ?? episode.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5
    }));
    const latest = episodeEntries.map((entry) => entry.lastModified).filter((date): date is string => Boolean(date)).sort().pop();
    entries.push({
      url: `${SITE_URL}/kategori/bersiri/${series.slug}`,
      ...(latest ? { lastModified: latest } : {}),
      changeFrequency: "weekly",
      priority: 0.6
    });
    entries.push(...episodeEntries);
  }

  return entries;
}
