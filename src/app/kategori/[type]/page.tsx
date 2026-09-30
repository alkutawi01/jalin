import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { WorkCover } from "../../../components/reader/WorkCover";
import { initContentRepository } from "../../../lib/content";
import { displayableGenre } from "../../../lib/reader/genre-display";
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

const CATEGORY_META: Record<string, { title: string; intro: string; headerLabel: string }> = {
  cerpen: {
    title: "Senarai Cerpen",
    intro: "Cerita pendek berilustrasi untuk pembaca Jalin.",
    headerLabel: "Cerpen",
  },
  novela: {
    title: "Senarai Novela",
    intro: "Novela pendek berilustrasi untuk pembaca Jalin.",
    headerLabel: "Novela",
  },
  bersiri: {
    title: "Senarai Bersiri",
    intro: "Siri berilustrasi untuk pembaca Jalin — sambungan demi sambungan.",
    headerLabel: "Bersiri",
  },
  fragmen: {
    title: "Senarai Fragmen",
    intro: "Sedutan bermakna daripada karya untuk pembaca Jalin.",
    headerLabel: "Fragmen",
  },
  sinopsis: {
    title: "Senarai Sinopsis",
    intro: "Penceritaan semula editorial karya lain.",
    headerLabel: "Sinopsis",
  },
};

const MODE_LABELS: Record<string, string> = {
  continuous: "Bersambung",
  anthology: "Antologi",
};

const STATUS_LABELS: Record<string, string> = {
  ongoing: "Berterusan",
  completed: "Tamat",
};

function formatDate(date: string | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return "—";
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const months = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
}

function WorkCard({ work, type }: { work: PublicWorkSummary; type: string }) {
  const genre = displayableGenre(work.genre);
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  const updated = work.updatedAt ?? work.publishedAt;
  const year = (updated ?? "2026").slice(0, 4);
  const label = CATEGORY_META[type]?.headerLabel ?? type;
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
          <h2 className="latest-card-title">{work.title}</h2>
          {work.dek ? <p className="latest-card-dek">{work.dek}</p> : null}
          <div className="latest-card-footer">
            <span className="latest-card-cta">Baca →</span>
            <span className="latest-card-date">{formatDate(updated) === "—" ? null : formatDate(updated)}</span>
          </div>
        </div>
      </a>
    </article>
  );
}

function SeriesCard({ series, episodeCount }: { series: PublicSeriesSummary; episodeCount: number }) {
  const genre = displayableGenre(series.genre);
  return (
    <article className="work-card">
      <a href={`/kategori/bersiri/${series.slug}`}>
        <div className="work-card-meta">
          <span>
            {MODE_LABELS[series.mode] ?? series.mode}
            {genre ? ` · ${genre}` : ""}
          </span>
          <span>{STATUS_LABELS[series.status] ?? series.status}</span>
          <span>{episodeCount} episod</span>
        </div>
        <h2 className="work-card-title">{series.title}</h2>
        {series.dek ? <p className="work-card-dek">{series.dek}</p> : null}
      </a>
    </article>
  );
}

export function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  return params.then(({ type }) => {
    const meta = CATEGORY_META[type];
    if (!meta) return {};
    return {
      title: meta.title,
      description: meta.intro,
      alternates: { canonical: `/kategori/${type}` },
      openGraph: {
        title: meta.title,
        description: meta.intro,
        url: `/kategori/${type}`
      }
    };
  });
}

function EmptyCategoryFallback({ currentType }: { currentType: string }) {
  const others = CATEGORY_META_LIST.filter(({ type }) => type !== currentType);
  return (
    <div className="category-empty">
      <p>Belum ada karya diterbitkan dalam kategori ini. Jelajahi kategori lain buat masa ini:</p>
      <div className="category-empty-links">
        {others.map(({ type, label }) => (
          <a key={type} href={`/kategori/${type}`}>{label}</a>
        ))}
      </div>
    </div>
  );
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

export default async function CategoryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const meta = CATEGORY_META[type];
  if (!meta) notFound();

  const isDb =
    (await initContentRepository()).source === "database";

  if (type === "bersiri" && isDb) {
    const repo = await initContentRepository();
    const seriesList = repo.getPublishedSeries();
    return (
      <>
        <SiteHeader active="bersiri" />
        <main>
          <div className="site-shell">
            <header className="category-head">
              <p className="category-kicker">{meta.headerLabel}</p>
              <h1>{meta.title}</h1>
              <p className="category-intro">{meta.intro}</p>
            </header>
            <div className="work-list">
              {seriesList.length === 0 ? <EmptyCategoryFallback currentType={type} /> : null}
              {seriesList.map((series) => (
                <SeriesCard
                  key={series.id}
                  series={projectPublicSeries(series)}
                  episodeCount={repo.getPublishedSeriesEpisodes(series.id).length}
                />
              ))}
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const works = (await getWorks(type)).sort((a, b) => {
    const aDate = a.updatedAt ?? a.publishedAt ?? "";
    const bDate = b.updatedAt ?? b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  return (
    <>
      <SiteHeader active={type as WorkType} />

      <main>
        <div className="site-shell">
          <header className="category-head">
            <p className="category-kicker">{meta.headerLabel}</p>
            <h1>{meta.title}</h1>
            <p className="category-intro">{meta.intro}</p>
          </header>

          <div className="latest-grid category-grid">
            {works.length === 0 ? <EmptyCategoryFallback currentType={type} /> : null}
            {works.map((work) => (
              <WorkCard
                key={work.slug}
                work={projectPublicWorkSummary(work)}
                type={type}
              />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
