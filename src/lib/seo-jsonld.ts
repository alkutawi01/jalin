import { SITE_URL, absoluteUrl } from "./seo";

/** Structured data for the reader pages (schema.org). Only what is public: no credits' private fields, no rights notes. */

export interface JsonLdWork {
  slug: string;
  title: string;
  type: string;
  dek?: string;
  genre?: string;
  /** The work's own audience note, e.g. "13-17". Only a stated age range is published. */
  audience?: string;
  publishedAt?: string;
  updatedAt?: string;
  heroSrc?: string;
  authors: string[];
  sections: { slug: string; title?: string }[];
}

/** An age range written in the work's audience field, or nothing: no age is assumed. */
export function audienceOf(text?: string): { audience?: Record<string, unknown> } {
  const match = text?.match(/(\d{1,2})\s*[-\u2013]\s*(\d{1,2})/);
  if (!match) return {};
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!(min >= 0 && max >= min && max <= 99)) return {};
  return { audience: { "@type": "PeopleAudience", suggestedMinAge: min, suggestedMaxAge: max } };
}

const publisher = { "@type": "Organization", name: "Jalin", url: SITE_URL };

function people(names: string[]) {
  return names.map((name) => ({ "@type": "Person", name }));
}

function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

const TYPE_LABEL: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

/** One JSON-LD graph for a work page, or for one chapter of a novela when sectionSlug is given. */
export function workJsonLd(work: JsonLdWork, sectionSlug?: string): Record<string, unknown> {
  const workPath = `/kategori/${work.type}/${work.slug}`;
  const common = {
    inLanguage: "ms",
    ...(work.genre ? { genre: work.genre } : {}),
    ...(work.dek ? { description: work.dek } : {}),
    ...(work.publishedAt ? { datePublished: work.publishedAt } : {}),
    ...(work.updatedAt ? { dateModified: work.updatedAt } : {}),
    ...(work.heroSrc ? { image: absoluteUrl(work.heroSrc) } : {}),
    ...(work.authors.length > 0 ? { author: people(work.authors) } : {}),
    publisher,
    isAccessibleForFree: true,
    ...audienceOf(work.audience)
  };
  const crumbs = [
    { name: "Jalin", path: "/" },
    { name: TYPE_LABEL[work.type] ?? work.type, path: `/kategori/${work.type}` },
    { name: work.title, path: workPath }
  ];

  if (work.type === "novela" && work.sections.length > 0) {
    const book = {
      "@type": "Book",
      "@id": absoluteUrl(workPath) + "#book",
      name: work.title,
      url: absoluteUrl(workPath),
      ...common,
      numberOfPages: undefined,
      hasPart: work.sections.map((section, index) => ({
        "@type": "Chapter",
        name: section.title || `Bab ${index + 1}`,
        position: index + 1,
        url: absoluteUrl(`${workPath}/${section.slug}`)
      }))
    };
    const index = sectionSlug ? work.sections.findIndex((section) => section.slug === sectionSlug) : -1;
    if (index >= 0) {
      const section = work.sections[index]!;
      const chapterPath = `${workPath}/${section.slug}`;
      return {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Chapter",
            "@id": absoluteUrl(chapterPath) + "#chapter",
            name: section.title || `Bab ${index + 1}`,
            position: index + 1,
            url: absoluteUrl(chapterPath),
            inLanguage: "ms",
            isPartOf: { "@id": absoluteUrl(workPath) + "#book" },
            isAccessibleForFree: true
          },
          { ...book, hasPart: undefined },
          breadcrumb([...crumbs, { name: section.title || `Bab ${index + 1}`, path: chapterPath }])
        ]
      };
    }
    return { "@context": "https://schema.org", "@graph": [book, breadcrumb(crumbs)] };
  }

  const schemaType = work.type === "cerpen" ? "ShortStory" : "CreativeWork";
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": schemaType, name: work.title, url: absoluteUrl(workPath), ...common },
      breadcrumb(crumbs)
    ]
  };
}

export interface JsonLdSeries {
  slug: string;
  title: string;
  dek?: string;
  genre?: string;
  heroSrc?: string;
  episodes: { slug: string; title: string; position: number }[];
}

/** A series page: the series with its published episodes, and where it sits on the site. */
export function seriesJsonLd(series: JsonLdSeries): Record<string, unknown> {
  const path = `/kategori/bersiri/${series.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWorkSeries",
        "@id": absoluteUrl(path) + "#series",
        name: series.title,
        url: absoluteUrl(path),
        inLanguage: "ms",
        ...(series.dek ? { description: series.dek } : {}),
        ...(series.genre ? { genre: series.genre } : {}),
        ...(series.heroSrc ? { image: absoluteUrl(series.heroSrc) } : {}),
        publisher,
        isAccessibleForFree: true,
        hasPart: series.episodes.map((episode) => ({
          "@type": "CreativeWork",
          name: episode.title,
          position: episode.position,
          url: absoluteUrl(`${path}/${episode.slug}`)
        }))
      },
      breadcrumb([
        { name: "Jalin", path: "/" },
        { name: "Bersiri", path: "/kategori/bersiri" },
        { name: series.title, path }
      ])
    ]
  };
}

/** An episode page: the episode as part of its series. */
export function episodeJsonLd(work: JsonLdWork, series: { slug: string; title: string }, position: number): Record<string, unknown> {
  const seriesPath = `/kategori/bersiri/${series.slug}`;
  const path = `${seriesPath}/${work.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": absoluteUrl(path) + "#episode",
        name: work.title,
        url: absoluteUrl(path),
        position,
        inLanguage: "ms",
        ...(work.genre ? { genre: work.genre } : {}),
        ...(work.dek ? { description: work.dek } : {}),
        ...(work.publishedAt ? { datePublished: work.publishedAt } : {}),
        ...(work.updatedAt ? { dateModified: work.updatedAt } : {}),
        ...(work.heroSrc ? { image: absoluteUrl(work.heroSrc) } : {}),
        ...(work.authors.length > 0 ? { author: people(work.authors) } : {}),
        publisher,
        isAccessibleForFree: true,
        ...audienceOf(work.audience),
        isPartOf: { "@type": "CreativeWorkSeries", "@id": absoluteUrl(seriesPath) + "#series", name: series.title, url: absoluteUrl(seriesPath) }
      },
      breadcrumb([
        { name: "Jalin", path: "/" },
        { name: "Bersiri", path: "/kategori/bersiri" },
        { name: series.title, path: seriesPath },
        { name: work.title, path }
      ])
    ]
  };
}

/** Serialises JSON-LD for a <script> tag: "<" is escaped so the data can never close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
