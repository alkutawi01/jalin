import type { Metadata } from "next";
import { laterOf } from "../../../../../lib/seo-jsonld";
import { notFound } from "next/navigation";
import { OG_SITE, absoluteUrl, clipDescription, shareImage, DEFAULT_SHARE_IMAGE } from "../../../../../lib/seo";
import { episodeHeroOf } from "../../../../../lib/reader/chapter-visuals";
import { initContentRepository } from "../../../../../lib/content";
import { getWorkBySlug } from "../../../../../lib/content/workLoader";
import EpisodeView from "../../../../../components/reader/EpisodeView";
import LockedWork from "../../../../../components/reader/LockedWork";
import { gateForWork } from "../../../../../lib/reader/access-gate";
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
  const mine = episodes.find((e) => e.slug === work.slug);
  const label = mine ? `Episod ${mine.position}: ` : "";
  const title = `${label}${work.title} · ${work.series.title}`;
  const description = clipDescription(work.dek ?? `${work.title}, ${work.series.title}. Siri Jalin.`);
  const path = `/kategori/bersiri/${work.series.slug}/${work.slug}`;
  // An episode without a picture of its own shares the series' picture.
  const hero = episodeHeroOf(work.visuals.find((visual) => visual.role === "hero"), work.series.hero);
  const image = [hero?.src ? shareImage(hero.src, hero.alt) : DEFAULT_SHARE_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_SITE, type: "article", title, description, url: path, images: image, ...(work.publishedAt ? { publishedTime: work.publishedAt } : {}), ...(work.updatedAt ? { modifiedTime: laterOf(work.updatedAt, work.publishedAt) } : {}) },
    twitter: { card: "summary_large_image", title, description, images: image.map((i) => i.url) }
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

  // An episode's text is kept for readers with access (the series page, with its list of episodes, stays open).
  const gate = await gateForWork(work.slug);
  if (gate.state !== "open") {
    return (
      <LockedWork
        work={{ type: work.type, title: work.title, dek: work.dek, genre: work.genre, credits: work.credits, visuals: work.visuals, publishedAt: work.publishedAt, sourceWork: work.sourceWork }}
        gate={gate.state}
        next={`/kategori/bersiri/${work.series.slug}/${work.slug}`}
        email={gate.email}
      />
    );
  }

  const episodes: SeriesEpisodeRef[] = isDb ? repo.getPublishedSeriesEpisodes(work.series.id) : [];

  return <EpisodeView work={work} episodes={episodes} />;
}
