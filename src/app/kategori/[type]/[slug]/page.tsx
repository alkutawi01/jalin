import type { Metadata } from "next";
import { laterOf } from "../../../../lib/seo-jsonld";
import { chapterPageLabel } from "../../../../lib/reader/chapter-label";
import { notFound } from "next/navigation";
import { OG_SITE, absoluteUrl, clipDescription, shareImage, shareImageUrl, DEFAULT_SHARE_IMAGE } from "../../../../lib/seo";
import { chapterHeroOf } from "../../../../lib/reader/chapter-visuals";
import { initContentRepository } from "../../../../lib/content";
import { getWorkBySlug } from "../../../../lib/content/workLoader";
import WorkView from "../../../../components/reader/WorkView";
import ReadingTracker from "../../../../components/reader/ReadingTracker";
import LockedWork from "../../../../components/reader/LockedWork";
import { gateForWork } from "../../../../lib/reader/access-gate";

// Editorial changes must be visible on work pages just as on the dynamic homepage.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ type: string; slug: string; sectionSlug?: string }>;
}): Promise<Metadata> {
  const { type, slug, sectionSlug } = await params;
  if (type === "bersiri") return {};

  const work = await getWork(slug);
  if (!work || work.type !== type) return {};

  const typeLabel = TYPE_LABELS[type] ?? type;
  const description = work.dek ?? `${typeLabel} Jalin — ${work.title}.`;
  const workHero = work.visuals.find((visual) => visual.role === "hero");

  const sections = work.sections && work.sections.length > 0 ? work.sections : [];
  const sectionIndex = sectionSlug ? sections.findIndex((section) => section.slug === sectionSlug) : -1;
  const chapter = sectionIndex >= 0 ? sections[sectionIndex] : undefined;
  // The link preview shows the same picture as the page: the chapter's own hero first, then the work's.
  const hero = chapterHeroOf(work.visuals, chapter?.slug) ?? workHero;
  const canonicalPath = chapter
    ? `/kategori/${type}/${slug}/${chapter.slug}`
    : `/kategori/${type}/${slug}`;
  // A chapter has its own title and description, so a search result or a shared link says which chapter it is.
  const chapterLabel = chapter ? chapterPageLabel(sectionIndex + 1, chapter.title) : "";
  const pageTitle = chapter ? `${chapterLabel} · ${work.title}` : work.title;
  const pageDescription = clipDescription(
    chapter ? `Bab ${sectionIndex + 1} daripada ${sections.length} · ${work.title}. ${description}` : description
  );

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: canonicalPath },
    openGraph: {
      ...OG_SITE,
      type: "article",
      title: pageTitle,
      description: pageDescription,
      url: canonicalPath,
      images: [hero?.src ? shareImage(hero.src, hero.alt) : DEFAULT_SHARE_IMAGE],
      ...(work.publishedAt ? { publishedTime: work.publishedAt } : {}),
      ...(work.updatedAt ? { modifiedTime: laterOf(work.updatedAt, work.publishedAt) } : {})
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [hero?.src ? shareImageUrl(hero.src) : DEFAULT_SHARE_IMAGE.url]
    }
  };
}

async function getWork(slug: string) {
  const repo = await initContentRepository();
  if (repo.source === "database") {
    return repo.getWork(slug);
  }
  return getWorkBySlug(slug);
}

export default async function WorkPage({
  params
}: {
  params: Promise<{ type: string; slug: string; sectionSlug?: string }>;
}) {
  const { type, slug, sectionSlug } = await params;

  // Bersiri nested episodes live at /kategori/bersiri/[seriesSlug]/[episodeSlug].
  // Flat /kategori/bersiri/[slug] is handled by the static series route (redirect).
  if (type === "bersiri") {
    notFound();
  }

  const work = await getWork(slug);
  if (!work || work.type !== type) {
    notFound();
  }

  // The text of a work (every chapter of a novela) is kept for readers with access. A novela's own page (its blurb and chapter list,
  // no chapter open) is not text, so it stays open: it is where a reader finds the chapters.
  const novelaLanding = (work.sections?.length ?? 0) > 0 && !sectionSlug;
  if (!novelaLanding) {
    const gate = await gateForWork(work.slug);
    if (gate.state !== "open") {
      const next = sectionSlug ? `/kategori/${type}/${slug}/${sectionSlug}` : `/kategori/${type}/${slug}`;
      return (
        <LockedWork
          work={{ type: work.type, title: work.title, dek: work.dek, genre: work.genre, credits: work.credits, visuals: work.visuals, publishedAt: work.publishedAt, sourceWork: work.sourceWork }}
          gate={gate.state}
          next={next}
          email={gate.email}
        />
      );
    }
  }
  return (
    <>
      <ReadingTracker workId={work.id} sectionSlug={sectionSlug} />
      <WorkView work={work} sectionSlug={sectionSlug} />
    </>
  );
}
