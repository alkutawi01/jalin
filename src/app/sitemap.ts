import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";
import { initContentRepository } from "../lib/content";
import { getAllWorks } from "../lib/content/workLoader";
import type { WorkType } from "../lib/content/types";

const CATEGORY_TYPES: WorkType[] = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];
const CONTRIBUTOR_SLUGS = ["nara-zahin", "rafiq-naim"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = await initContentRepository();
  const works = repo.source === "database" ? repo.getWorks() : getAllWorks();

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...CATEGORY_TYPES.map((type) => ({
      url: `${SITE_URL}/kategori/${type}`,
      changeFrequency: "daily" as const,
      priority: 0.7
    })),
    ...CONTRIBUTOR_SLUGS.map((slug) => ({
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
    entries.push({
      url: `${SITE_URL}/kategori/bersiri/${series.slug}`,
      changeFrequency: "weekly",
      priority: 0.6
    });
    for (const episode of repo.getPublishedSeriesEpisodes(series.id)) {
      entries.push({
        url: `${SITE_URL}/kategori/bersiri/${series.slug}/${episode.slug}`,
        changeFrequency: "weekly",
        priority: 0.5
      });
    }
  }

  return entries;
}
