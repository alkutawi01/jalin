import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { gateSite } from "../../../lib/reader/access-gate";
import { OG_SITE, DEFAULT_SHARE_IMAGE } from "../../../lib/seo";
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
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { renderAttribution } from "@/components/reader/Attribution";
import { categoryIntro, DEFAULT_CATEGORY_INTROS, isCategoryType } from "@/lib/site-copy";
import CategoryControls from "../../../components/reader/CategoryControls";
import { applyListQuery, isFilteredQuery, listFacets, parseListQuery, type ListItem } from "../../../lib/reader/category-list";

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

const MODE_LABELS: Record<string, string> = {
  continuous: "Berturutan",
  anthology: "Antologi",
};

const STATUS_LABELS: Record<string, string> = {
  ongoing: "Masih diteruskan",
  completed: "Tamat",
};

function formatDate(date: string | undefined): string {
  return formatMalayDate(date) ?? "—";
}

function WorkCard({ work, type }: { work: PublicWorkSummary; type: string }) {
  const genre = displayableGenre(work.genre);
  const reading = work.readingMinutes ? `± ${work.readingMinutes} minit` : null;
  const published = work.publishedAt;
  const year = (published ?? "2026").slice(0, 4);
  const label = categoryMeta(type)?.headerLabel ?? type;
  return (
    <article className="latest-card">
      <a href={`/kategori/${type}/${work.slug}`}>
        <div className="latest-card-cover">
          <WorkCover type={work.type} title={work.title} hero={work.hero} rightsYear={year} />
        </div>
        <div className="latest-card-body">
          <div className="latest-card-meta">
            <span className="latest-card-type">{genre ? `${label} · ${genre}` : label}</span>
            {reading ? <span className="latest-card-reading">{reading}</span> : null}
          </div>
          <h2 className="latest-card-title" style={{ fontStyle: "normal" }}>{work.title}</h2>
          {work.attribution ? <p className="work-attribution">{renderAttribution(work.attribution.primary)}</p> : null}
          {work.attribution?.secondary ? <p className="work-attribution-source">{renderAttribution(work.attribution.secondary)}</p> : null}
          {work.dek ? <p className="latest-card-dek">{work.dek}</p> : null}
          <div className="latest-card-footer">
            <span className="latest-card-cta">Baca →</span>
            <span className="latest-card-date">{formatDate(published) === "—" ? null : formatDate(published)}</span>
          </div>
        </div>
      </a>
    </article>
  );
}

export const dynamic = "force-dynamic";

function SeriesCard({ series, episodeCount }: { series: PublicSeriesSummary; episodeCount: number }) {
  const genre = displayableGenre(series.genre);
  return (
    <article className="series-list-card">
      <a href={`/kategori/bersiri/${series.slug}`}>
        <div className="series-list-media">
          {series.hero ? <Image src={series.hero.src} alt={series.hero.alt || `Ilustrasi siri ${series.title}`} fill sizes="(max-width: 680px) 100vw, 360px" style={cropStyle(series.hero.crop)} /> : <span>{series.title}</span>}
        </div>
        <div className="series-list-body">
          <p className="series-list-meta">{genre || MODE_LABELS[series.mode] || series.mode} · {episodeCount} episod · {STATUS_LABELS[series.status] ?? series.status}</p>
          <h2>{series.title}</h2>
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
  const filtered = isFilteredQuery(parseListQuery(await searchParams));
  return {
    title: meta.title,
    description: intro,
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `/kategori/${type}` },
    openGraph: {
      ...OG_SITE,
      type: "website",
      title: meta.title,
      description: intro,
      url: `/kategori/${type}`,
      images: [DEFAULT_SHARE_IMAGE]
    },
    twitter: { card: "summary_large_image", title: meta.title, description: intro, images: [DEFAULT_SHARE_IMAGE.url] }
  };
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
  const query = parseListQuery(await searchParams);
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
        ...(series.genre ? { genre: series.genre } : {}),
        ...(minutes > 0 ? { readingMinutes: minutes } : {}),
        ...(latest ? { publishedAt: latest, updatedAt: latest } : {})
      };
      return item;
    });
    const shown = applyListQuery(entries, query);
    return (
      <>
        <SiteHeader active="bersiri" />
        <main id="kandungan" tabIndex={-1}>
          <div className="site-shell">
            <header className="category-head">
              <p className="category-kicker">{meta.headerLabel}</p>
              <h1>{meta.title}</h1>
              <p className="category-intro">{intro}</p>
            </header>
            <CategoryControls type={type} nounPlural={noun} query={query} facets={listFacets(entries)} shown={shown.length} total={entries.length} />
            <div className="work-list">
              {entries.length === 0 ? <EmptyCategoryFallback currentType={type} /> : null}
              {entries.length > 0 && shown.length === 0 ? <NoMatch type={type} /> : null}
              {shown.map((entry) => (
                <SeriesCard key={entry.series.id} series={projectPublicSeries(entry.series)} episodeCount={entry.episodeCount} />
              ))}
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const summaries = (await getWorks(type)).map((work) => projectPublicWorkSummary(work));
  const works = applyListQuery(summaries, query);

  return (
    <>
      <SiteHeader active={type as WorkType} />

      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell">
          <header className="category-head">
            <p className="category-kicker">{meta.headerLabel}</p>
            <h1>{meta.title}</h1>
            <p className="category-intro">{intro}</p>
          </header>

          <CategoryControls type={type} nounPlural={noun} query={query} facets={listFacets(summaries)} shown={works.length} total={summaries.length} />

          <div className="latest-grid category-grid">
            {summaries.length === 0 ? <EmptyCategoryFallback currentType={type} /> : null}
            {summaries.length > 0 && works.length === 0 ? <NoMatch type={type} /> : null}
            {works.map((work) => (
              <WorkCard key={work.slug} work={work} type={type} />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
