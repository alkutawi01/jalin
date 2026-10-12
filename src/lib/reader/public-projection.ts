import type {
  ImageCrop,
  ReadingSection,
  SeriesMeta,
  Work,
  WorkType
} from "../content/types";
import { projectCardAttribution, type CardAttribution } from "./card-attribution";
import { smartQuotes } from "../admin/smart-quotes";
import { spacedDashes } from "./spaced-dash";
import { countryLabel } from "./countries";

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
  /** Negara latar as shown on a card ("Jepun", "Malaysia-Indonesia"); absent for no country or for Malaysia alone. */
  country?: string;
  dek?: string;
  readingMinutes?: number;
  /** The stored audience value (band codes such as "remaja" or "belia,dewasa"): for filtering a list, shown to readers as labels. */
  audience?: string;
  publishedAt?: string;
  updatedAt?: string;
  hero?: { src: string; alt: string; crop?: ImageCrop };
  attribution?: CardAttribution;
}

export type PublicFeaturedSummary = PublicWorkSummary;

export interface PublicSeriesSummary {
  slug: string;
  title: string;
  dek?: string;
  genre?: string;
  audience?: string;
  hero?: { src: string; alt: string; crop?: ImageCrop };
  mode: SeriesMeta["mode"];
  status: SeriesMeta["status"];
}

export interface PublicSectionRef {
  slug: string;
  title?: string;
}

export function projectPublicWorkSummary(work: Work): PublicWorkSummary {
  const hero = work.visuals.find((visual) => visual.role === "hero");
  const attribution = projectCardAttribution(work);
  return {
    type: work.type,
    slug: work.slug,
    title: work.title,
    ...(work.genre ? { genre: work.genre } : {}),
    ...(countryLabel(work.metadata?.countries) ? { country: countryLabel(work.metadata?.countries) } : {}),
    ...(work.dek ? { dek: spacedDashes(smartQuotes(work.dek)) } : {}),
    ...(work.readingMinutes ? { readingMinutes: work.readingMinutes } : {}),
    ...(work.audience ? { audience: work.audience } : {}),
    ...(work.publishedAt ? { publishedAt: work.publishedAt } : {}),
    ...(work.updatedAt ? { updatedAt: work.updatedAt } : {}),
    ...(hero ? { hero: { src: hero.src, alt: hero.alt, ...(hero.crop ? { crop: hero.crop } : {}) } } : {}),
    ...(attribution ? { attribution } : {})
  };
}

export function projectPublicFeaturedSummary(
  work: Work
): PublicFeaturedSummary {
  return projectPublicWorkSummary(work);
}

export function projectPublicSeries(series: SeriesMeta): PublicSeriesSummary {
  return {
    slug: series.slug,
    title: series.title,
    ...(series.dek ? { dek: spacedDashes(smartQuotes(series.dek)) } : {}),
    ...(series.genre ? { genre: series.genre } : {}),
    ...(series.audience ? { audience: series.audience } : {}),
    ...(series.hero ? { hero: { src: series.hero.src, alt: series.hero.alt, ...(series.hero.crop ? { crop: series.hero.crop } : {}) } } : {}),
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
