import { initContentRepository } from "../../lib/content";
import { getAllWorks } from "../../lib/content/workLoader";
import { buildRss, type FeedItem } from "../../lib/reader/rss";
import { smartQuotes } from "../../lib/admin/smart-quotes";
import { spacedDashes } from "../../lib/reader/spaced-dash";

// Like the sitemap: cached for five minutes so a feed reader polling does not wake the database each time.
export const revalidate = 300;

const LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

export async function GET(): Promise<Response> {
  const repo = await initContentRepository();
  const works = repo.source === "database" ? repo.getWorks() : getAllWorks();
  const items: FeedItem[] = [];
  for (const work of works) {
    if (work.type === "bersiri") continue; // an episode is listed under its series below
    items.push({
      title: work.title,
      path: `/kategori/${work.type}/${work.slug}`,
      publishedAt: work.publishedAt,
      ...(work.dek ? { dek: spacedDashes(smartQuotes(work.dek)) } : {}),
      category: LABELS[work.type] ?? work.type
    });
  }
  for (const series of repo.getPublishedSeries()) {
    for (const episode of repo.getPublishedSeriesEpisodes(series.id)) {
      items.push({
        title: `${series.title}: ${episode.title}`,
        path: `/kategori/bersiri/${series.slug}/${episode.slug}`,
        publishedAt: episode.publishedAt,
        ...(episode.dek ? { dek: spacedDashes(smartQuotes(episode.dek)) } : {}),
        category: LABELS.bersiri
      });
    }
  }
  return new Response(buildRss(items), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
  });
}
