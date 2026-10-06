import type { Metadata } from "next";
import { chapterPageLabel } from "../../../../lib/reader/chapter-label";
import { notFound } from "next/navigation";
import { absoluteUrl, clipDescription, shareImageUrl } from "../../../../lib/seo";
import { chapterHeroOf } from "../../../../lib/reader/chapter-visuals";
import { initContentRepository } from "../../../../lib/content";
import { getWorkBySlug } from "../../../../lib/content/workLoader";
import WorkView from "../../../../components/reader/WorkView";

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
      type: "article",
      title: pageTitle,
      description: pageDescription,
      url: canonicalPath,
      images: hero?.src ? [{ url: shareImageUrl(hero.src) }] : undefined
    },
    twitter: {
      card: hero?.src ? "summary_large_image" : "summary",
      title: pageTitle,
      description: pageDescription,
      images: hero?.src ? [shareImageUrl(hero.src)] : undefined
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

  return <WorkView work={work} sectionSlug={sectionSlug} />;
}
