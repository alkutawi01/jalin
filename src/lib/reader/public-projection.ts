import type {
  ReadingSection,
  SeriesMeta,
  Work,
  WorkType
} from "../content/types";

/**
 * Public page projection boundary.
 *
 * Next.js serializes component props into the public RSC/HTML payload, so
 * anything passed as a prop on a public route reaches the browser. Public
 * pages must therefore project the minimum rendering data here — on the
 * server — before handing it to components. Raw Work internals (credits,
 * visuals provenance, sourceWork, editorialHistory, glossary source, …)
 * must never cross this boundary.
 */

export interface PublicWorkSummary {
  type: WorkType;
  slug: string;
  title: string;
  genre?: string;
  dek?: string;
  readingMinutes?: number;
  publishedAt?: string;
  updatedAt?: string;
}

export interface PublicFeaturedSummary extends PublicWorkSummary {
  hero?: { src: string; alt: string };
}

export interface PublicSeriesSummary {
  slug: string;
  title: string;
  dek?: string;
  genre?: string;
  mode: SeriesMeta["mode"];
  status: SeriesMeta["status"];
}

export interface PublicSectionRef {
  slug: string;
  title?: string;
}

export function projectPublicWorkSummary(work: Work): PublicWorkSummary {
  return {
    type: work.type,
    slug: work.slug,
    title: work.title,
    ...(work.genre ? { genre: work.genre } : {}),
    ...(work.dek ? { dek: work.dek } : {}),
    ...(work.readingMinutes ? { readingMinutes: work.readingMinutes } : {}),
    ...(work.publishedAt ? { publishedAt: work.publishedAt } : {}),
    ...(work.updatedAt ? { updatedAt: work.updatedAt } : {})
  };
}

export function projectPublicFeaturedSummary(
  work: Work
): PublicFeaturedSummary {
  const hero = work.visuals.find((visual) => visual.role === "hero");
  return {
    ...projectPublicWorkSummary(work),
    ...(hero ? { hero: { src: hero.src, alt: hero.alt } } : {})
  };
}

export function projectPublicSeries(series: SeriesMeta): PublicSeriesSummary {
  return {
    slug: series.slug,
    title: series.title,
    ...(series.dek ? { dek: series.dek } : {}),
    ...(series.genre ? { genre: series.genre } : {}),
    mode: series.mode,
    status: series.status
  };
}

export function projectPublicSections(
  sections: ReadingSection[]
): PublicSectionRef[] {
  return sections.map((section) => ({
    slug: section.slug,
    ...(section.title ? { title: section.title } : {})
  }));
}
