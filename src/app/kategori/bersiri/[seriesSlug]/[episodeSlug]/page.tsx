import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl, clipDescription, shareImageUrl } from "../../../../../lib/seo";
import { episodeHeroOf } from "../../../../../lib/reader/chapter-visuals";
import { initContentRepository } from "../../../../../lib/content";
import { getWorkBySlug } from "../../../../../lib/content/workLoader";
import EpisodeView from "../../../../../components/reader/EpisodeView";
import type { SeriesEpisodeRef } from "../../../../../lib/content/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

async function resolveEpisode(seriesSlug: string, episodeSlug: string) {
  const repo = await initContentRepository();
  const isDb = repo.source === "database";

  let work;
  if (isDb) {
    // Only an episode in the series' public run. A continuous series shows an unbroken run from episode 1, so an episode after a gap
    // (an earlier one archived or not yet published) is not public; it used to answer 200 through a lookup by episode slug alone,
    // although the series page, its navigation and the sitemap leave it out.
    work = repo.getEpisodeBySeriesAndSlug(seriesSlug, episodeSlug);
  } else {
    work = getWorkBySlug(episodeSlug);
    if (work && work.series?.slug !== seriesSlug) work = undefined;
  }
  return { repo, isDb, work };
}

/** Each episode gets its own title ("Episod 2: Tajuk · Siri"), description, canonical and share card. */
export async function generateMetadata({ params }: { params: Promise<{ seriesSlug: string; episodeSlug: string }> }): Promise<Metadata> {
  const { seriesSlug, episodeSlug } = await params;
  const { repo, isDb, work } = await resolveEpisode(seriesSlug, episodeSlug);
  if (!work || work.type !== "bersiri" || !work.series) return {};
  const episodes = isDb ? repo.getPublishedSeriesEpisodes(work.series.id) : [];
  const index = episodes.findIndex((e) => e.slug === work.slug);
  const label = index >= 0 ? `Episod ${index + 1}: ` : "";
  const title = `${label}${work.title} · ${work.series.title}`;
  const description = clipDescription(work.dek ?? `${work.title}, ${work.series.title}. Siri Jalin.`);
  const path = `/kategori/bersiri/${work.series.slug}/${work.slug}`;
  // An episode without a picture of its own shares the series' picture.
  const hero = episodeHeroOf(work.visuals.find((visual) => visual.role === "hero"), work.series.hero);
  const image = hero?.src ? [{ url: shareImageUrl(hero.src) }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", title, description, url: path, images: image },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image?.map((i) => i.url) }
  };
}

export default async function EpisodePage({
  params
}: {
  params: Promise<{ seriesSlug: string; episodeSlug: string }>;
}) {
  const { seriesSlug, episodeSlug } = await params;

  const { repo, isDb, work } = await resolveEpisode(seriesSlug, episodeSlug);

  if (!work || work.type !== "bersiri") notFound();
  if (!work.series) notFound();

  const episodes: SeriesEpisodeRef[] = isDb ? repo.getPublishedSeriesEpisodes(work.series.id) : [];

  return <EpisodeView work={work} episodes={episodes} />;
}
