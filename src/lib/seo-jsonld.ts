import { DEFAULT_SHARE_IMAGE, SITE_URL, absoluteUrl, shareImageUrl } from "./seo";
import { audienceAgeRange } from "./audience";

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
  /** The language the text is published in ("ms" unless it is a work published in Indonesian, "id"). */
  inLanguage?: string;
  authors: string[];
  /**
   * A sinopsis or fragmen is Jalin's own text about someone else's book, so the original author is not the page's author:
   * it is the author of the book the page is based on.
   */
  basedOn?: { title?: string; authors: string[] };
  sections: { slug: string; title?: string }[];
}

/** The modified date can never be before the published date (an older import left some works that way): the later of the two. */
export function laterOf(modified: string, published?: string): string {
  if (!published) return modified;
  const m = Date.parse(modified);
  const p = Date.parse(published);
  return Number.isFinite(m) && Number.isFinite(p) && m < p ? published : modified;
}

/**
 * The age a work is suitable FROM, or nothing when its audience field states none. Only the starting age is published
 * (Izzat, 7 Oct 2026: Jalin does not narrow its readers): "13 to 17" told a search engine the work is not for adults, and a
 * band with no upper end was published as "up to 99".
 */
export function audienceOf(text?: string): { audience?: Record<string, unknown> } {
  // The stored value is band codes ("belia,dewasa"), a band label or an older age range; all give the ages they cover.
  const range = audienceAgeRange(text);
  if (!range) return {};
  return { audience: { "@type": "PeopleAudience", suggestedMinAge: range.min } };
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
    inLanguage: work.inLanguage ?? "ms",
    ...(work.genre ? { genre: work.genre } : {}),
    ...(work.dek ? { description: work.dek } : {}),
    ...(work.publishedAt ? { datePublished: work.publishedAt } : {}),
    ...(work.updatedAt ? { dateModified: laterOf(work.updatedAt, work.publishedAt) } : {}),
    ...(work.heroSrc ? { image: shareImageUrl(work.heroSrc) } : {}),
    ...(work.basedOn
      ? {
          isBasedOn: {
            "@type": "Book",
            ...(work.basedOn.title ? { name: work.basedOn.title } : {}),
            ...(work.basedOn.authors.length > 0 ? { author: people(work.basedOn.authors) } : {})
          }
        }
      : work.authors.length > 0
        ? { author: people(work.authors) }
        : {}),
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
            inLanguage: work.inLanguage ?? "ms",
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
  /** The writers shown under the series title (the page's byline). */
  authors?: string[];
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
        ...(series.heroSrc ? { image: shareImageUrl(series.heroSrc) } : {}),
        ...(series.authors && series.authors.length > 0 ? { author: people(series.authors) } : {}),
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
        ...(work.updatedAt ? { dateModified: laterOf(work.updatedAt, work.publishedAt) } : {}),
        ...(work.heroSrc ? { image: shareImageUrl(work.heroSrc) } : {}),
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

/**
 * The homepage's structured data: what the site is (WebSite, with its search page) and who publishes it (Organization).
 * The homepage had none, so a search engine knew the works but not the site they belong to.
 */
export function siteJsonLd(description: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Jalin",
        alternateName: "Jalin — oleh Adjung",
        description,
        inLanguage: "ms",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/cari?q={search_term_string}` },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Jalin",
        url: SITE_URL,
        logo: absoluteUrl("/brand/jalin-icon-color.svg"),
        image: DEFAULT_SHARE_IMAGE.url,
        slogan: "Selami dunia melalui cerita",
        parentOrganization: { "@type": "Organization", name: "Adjung Press" }
      }
    ]
  };
}

/** Serialises JSON-LD for a <script> tag: "<" is escaped so the data can never close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
