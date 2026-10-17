import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { StoryCardView } from "../../../components/reader/StoryCollection";
import { workToStoryCard } from "../../../lib/reader/story-collection";
import { gateSite } from "../../../lib/reader/access-gate";
import { OG_SITE, DEFAULT_SHARE_IMAGE, clipDescription, shareImage } from "../../../lib/seo";
import { categoryJsonLd, jsonLdString } from "../../../lib/seo-jsonld";
import JalinEmblem from "../../../components/reader/JalinEmblem";
import { WorkCover } from "../../../components/reader/WorkCover";
import { cropStyle } from "../../../lib/reader/crop";
import { initContentRepository } from "../../../lib/content";
import { displayableGenre } from "../../../lib/reader/genre-display";
import { formatMalayDate } from "../../../lib/reader/format-date";
import { getWorksByType } from "../../../lib/content/workLoader";
import type { Work, WorkType } from "../../../lib/content/types";
import {
  projectPublicSeries,
  projectPublicWorkSummary,
  type PublicSeriesSummary,
  type PublicWorkSummary
} from "../../../lib/reader/public-projection";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { renderAttribution } from "@/components/reader/Attribution";
import { categoryIntro, DEFAULT_CATEGORY_INTROS, isCategoryType } from "@/lib/site-copy";
import CategoryControls from "../../../components/reader/CategoryControls";
import { loadAudienceBands } from "../../../lib/audience-store";
import { seriesStatusLabel } from "../../../lib/reader/series-status";
import CategoryPagination from "../../../components/reader/CategoryPagination";
import { applyListQuery, isFilteredQuery, listFacets, pageQueryString, paginate, parseListQuery, parsePage, type ListItem } from "../../../lib/reader/category-list";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
/** "9 cerpen": the plural noun of each category, for the count under the controls. */
const CATEGORY_NOUN: Record<string, string> = { cerpen: "cerpen", novela: "novela", bersiri: "siri", fragmen: "fragmen", sinopsis: "sinopsis" };

const CATEGORY_META: Record<string, { title: string; intro: string; headerLabel: string }> = {
  cerpen: {
    title: "Senarai cerpen",
    intro: DEFAULT_CATEGORY_INTROS.cerpen,
    headerLabel: "Cerpen",
  },
  novela: {
    title: "Senarai novela",
    intro: DEFAULT_CATEGORY_INTROS.novela,
    headerLabel: "Novela",
  },
  bersiri: {
    title: "Senarai bersiri",
    intro: DEFAULT_CATEGORY_INTROS.bersiri,
    headerLabel: "Bersiri",
  },
  fragmen: {
    title: "Senarai fragmen",
    intro: DEFAULT_CATEGORY_INTROS.fragmen,
    headerLabel: "Fragmen",
  },
  sinopsis: {
    title: "Senarai sinopsis",
    intro: DEFAULT_CATEGORY_INTROS.sinopsis,
    headerLabel: "Sinopsis",
  },
};

function formatDate(date: string | undefined): string {
  return formatMalayDate(date) ?? "—";
}

function WorkCard({ work, type, priority }: { work: PublicWorkSummary; type: string; priority?: boolean }) {
  return <StoryCardView card={workToStoryCard(work, `/kategori/${type}/${work.slug}`)} heading="h2" priority={priority} />;
}

export const dynamic = "force-dynamic";

function SeriesCard({ series, episodeCount, priority }: { series: PublicSeriesSummary; episodeCount: number; priority?: boolean }) {
  const genre = displayableGenre(series.genre);
  return (
    <article className="series-list-card">
      <a href={`/kategori/bersiri/${series.slug}`}>
        <div className="series-list-media">
          {series.hero ? <Image src={series.hero.src} alt={series.hero.alt || `Ilustrasi siri ${series.title}`} fill sizes="(max-width: 680px) 100vw, 360px" priority={priority} style={cropStyle(series.hero.crop)} /> : <span>{series.title}</span>}
        </div>
        <div className="series-list-body">
          <p className="series-list-meta">Bersiri{genre ? ` · ${genre}` : ""}</p>
          <h2>{series.title}</h2>
          <p className="series-list-facts">{episodeCount} episod · {seriesStatusLabel(series.status)}</p>
          {series.dek ? <p className="series-list-dek">{series.dek}</p> : null}
          <span className="series-list-action">Lihat siri dan episod</span>
        </div>
      </a>
    </article>
  );
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: SearchParams }): Promise<Metadata> {
  const { type } = await params;
  const meta = categoryMeta(type);
  if (!meta) return {};
  const intro = isCategoryType(type) ? await categoryIntro(type) : meta.intro;
  // A sorted or filtered view is the same list in another order: it points at the plain list and is not indexed on its own.
  const rawQuery = await searchParams;
  const filtered = isFilteredQuery(parseListQuery(rawQuery, await loadAudienceBands()));
  // A later page of the plain list is a page of its own (it points at itself); a sorted or filtered view points at the plain list.
  const page = parsePage(rawQuery);
  const canonical = !filtered && page > 1 ? `/kategori/${type}${pageQueryString({}, page)}` : `/kategori/${type}`;
  const summary = await categorySummary(type);
  // The intro says what the category is; the count says there is something to read ("9 cerpen diterbitkan").
  const description = clipDescription(summary.count > 0 ? `${intro} ${summary.count} ${CATEGORY_NOUN[type] ?? "karya"} diterbitkan.` : intro);
  // The newest work's picture stands for the category when it is shared; the Jalin card when no work has a picture.
  const picture = summary.heroSrc ? shareImage(summary.heroSrc, summary.heroAlt) : DEFAULT_SHARE_IMAGE;
  return {
    title: page > 1 && !filtered ? `${meta.title}, halaman ${page}` : meta.title,
    description,
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical },
    openGraph: {
      ...OG_SITE,
      type: "website",
      title: meta.title,
      description,
      url: `/kategori/${type}`,
      images: [picture]
    },
    twitter: { card: "summary_large_image", title: meta.title, description, images: [picture.url] }
  };
}

/** How many are published in a category and the picture of the newest one, for the page's description and share card. */
async function categorySummary(type: string): Promise<{ count: number; heroSrc?: string; heroAlt?: string }> {
  try {
    const repo = await initContentRepository();
    if (type === "bersiri" && repo.source === "database") {
      const list = repo.getPublishedSeries();
      const withHero = list.find((series) => series.hero?.src);
      return { count: list.length, ...(withHero?.hero ? { heroSrc: withHero.hero.src, heroAlt: withHero.hero.alt } : {}) };
    }
    const works = (await getWorks(type)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    const hero = works.map((work) => work.visuals.find((visual) => visual.role === "hero")).find((visual) => visual?.src);
    return { count: works.length, ...(hero ? { heroSrc: hero.src, heroAlt: hero.alt } : {}) };
  } catch {
    return { count: 0 };
  }
}

function EmptyCategoryFallback({ currentType }: { currentType: string }) {
  const others = CATEGORY_META_LIST.filter(({ type }) => type !== currentType);
  return (
    <div className="category-empty">
      <JalinEmblem size={72} />
      <p>Belum ada karya diterbitkan dalam kategori ini. Terokai kategori lain buat masa ini:</p>
      <div className="category-empty-links">
        {others.map(({ type, label }) => (
          <a key={type} href={`/kategori/${type}`}>{label}</a>
        ))}
      </div>
    </div>
  );
}

/** The category an address names, or undefined: "constructor" and "__proto__" are not categories (they were shown as an empty one, answered 200). */
function categoryMeta(type: string) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_META, type) ? CATEGORY_META[type] : undefined;
}

const CATEGORY_META_LIST = Object.entries(CATEGORY_META).map(([type, meta]) => ({
  type,
  label: meta.headerLabel
}));

async function getWorks(type: string): Promise<Work[]> {
  const repo = await initContentRepository();
  if (repo.source === "database") {
    return repo.getWorksByType(type as WorkType);
  }
  return getWorksByType(type as WorkType);
}

/** Nothing matched the chosen filters (the category itself is not empty): say so and offer the way back. */
function NoMatch({ type }: { type: string }) {
  return (
    <p className="list-no-match">
      Tiada karya sepadan dengan penapis ini. <a href={`/kategori/${type}`}>Kosongkan penapis</a>
    </p>
  );
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: SearchParams }) {
  await gateSite();
  const { type } = await params;
  const meta = categoryMeta(type);
  if (!meta) notFound();
  const intro = isCategoryType(type) ? await categoryIntro(type) : meta.intro;
  const bands = await loadAudienceBands();
  const query = parseListQuery(await searchParams, bands);
  const noun = CATEGORY_NOUN[type] ?? "karya";

  const isDb =
    (await initContentRepository()).source === "database";

  if (type === "bersiri" && isDb) {
    const repo = await initContentRepository();
    // A series is sorted by its newest published episode and measured by the length of all its published episodes.
    const entries = repo.getPublishedSeries().map((series) => {
      const episodes = repo.getPublishedSeriesEpisodes(series.id);
      const dates = episodes.map((episode) => episode.publishedAt ?? "").filter(Boolean).sort();
      const latest = dates[dates.length - 1];
      const minutes = episodes.reduce((sum, episode) => sum + (episode.readingMinutes ?? 0), 0);
      const item: ListItem & { series: typeof series; episodeCount: number } = {
        series,
        episodeCount: episodes.length,
        title: series.title,
        status: series.status,
        ...(series.genre ? { genre: series.genre } : {}),
        ...(series.audience ? { audience: series.audience } : {}),
        ...(minutes > 0 ? { readingMinutes: minutes } : {}),
        ...(latest ? { publishedAt: latest, updatedAt: latest } : {})
      };
      return item;
    });
    const filteredSeries = applyListQuery(entries, query, bands);
    const requestedPage = parsePage(await searchParams);
    const paged = paginate(filteredSeries, requestedPage);
    // A page past the end is not a page of its own: it used to show the last page again under its own address, title and canonical.
    if (requestedPage > paged.page) redirect(`/kategori/${type}${pageQueryString(query, paged.page)}`);
    return (
      <>
        <SiteHeader active="bersiri" />
        <main id="kandungan" tabIndex={-1}>
          <div className="site-shell">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(categoryJsonLd({ type, title: meta.title, description: intro, items: entries.map((entry) => ({ name: entry.series.title, path: `/kategori/bersiri/${entry.series.slug}` })) })) }} />
            <header className="category-head">
              <p className="category-kicker">{meta.headerLabel}</p>
              <h1>{meta.title}</h1>
              <p className="category-intro">{intro}</p>
            </header>
            <CategoryControls type={type} nounPlural={noun} query={query} facets={listFacets(entries, bands)} shown={filteredSeries.length} total={entries.length} />
            {entries.length === 0 ? <EmptyCategoryFallback currentType={type} /> : null}
            {entries.length > 0 && filteredSeries.length === 0 ? <NoMatch type={type} /> : null}
            {paged.items.length > 0 ? (
              <ul className="work-list" role="list" aria-label={`Senarai ${noun}`}>
                {paged.items.map((entry, index) => (
                  <li key={entry.series.id}>
                    <SeriesCard series={projectPublicSeries(entry.series)} episodeCount={entry.episodeCount} priority={index < 2} />
                  </li>
                ))}
              </ul>
            ) : null}
            <CategoryPagination base={`/kategori/${type}`} query={query} page={paged.page} pages={paged.pages} />
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const summaries = (await getWorks(type)).map((work) => projectPublicWorkSummary(work));
  const works = applyListQuery(summaries, query, bands);
  const requestedPage = parsePage(await searchParams);
  const paged = paginate(works, requestedPage);
  // A page past the end is not a page of its own: it used to show the last page again under its own address, title and canonical.
  if (requestedPage > paged.page) redirect(`/kategori/${type}${pageQueryString(query, paged.page)}`);

  return (
    <>
      <SiteHeader active={type as WorkType} />

      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(categoryJsonLd({ type, title: meta.title, description: intro, items: summaries.map((work) => ({ name: work.title, path: `/kategori/${type}/${work.slug}` })) })) }} />
          <header className="category-head">
            <p className="category-kicker">{meta.headerLabel}</p>
            <h1>{meta.title}</h1>
            <p className="category-intro">{intro}</p>
          </header>

          <CategoryControls type={type} nounPlural={noun} query={query} facets={listFacets(summaries, bands)} shown={works.length} total={summaries.length} />

          {summaries.length === 0 ? <EmptyCategoryFallback currentType={type} /> : null}
          {summaries.length > 0 && works.length === 0 ? <NoMatch type={type} /> : null}
          {paged.items.length > 0 ? (
            <ul className="latest-grid category-grid" role="list" aria-label={`Senarai ${noun}`}>
              {paged.items.map((work, index) => (
                <li key={work.slug}>
                  <WorkCard work={work} type={type} priority={index < 3} />
                </li>
              ))}
            </ul>
          ) : null}
          <CategoryPagination base={`/kategori/${type}`} query={query} page={paged.page} pages={paged.pages} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
