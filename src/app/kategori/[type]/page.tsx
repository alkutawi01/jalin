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
import Image from "next/image";
import { renderAttribution } from "@/components/reader/Attribution";
import { categoryIntro, DEFAULT_CATEGORY_INTROS, isCategoryType } from "@/lib/site-copy";

const CATEGORY_META: Record<string, { title: string; intro: string; headerLabel: string }> = {
  cerpen: {
    title: "Senarai Cerpen",
    intro: DEFAULT_CATEGORY_INTROS.cerpen,
    headerLabel: "Cerpen",
  },
  novela: {
    title: "Senarai Novela",
    intro: DEFAULT_CATEGORY_INTROS.novela,
    headerLabel: "Novela",
  },
  bersiri: {
    title: "Senarai Bersiri",
    intro: DEFAULT_CATEGORY_INTROS.bersiri,
    headerLabel: "Bersiri",
  },
  fragmen: {
    title: "Senarai Fragmen",
    intro: DEFAULT_CATEGORY_INTROS.fragmen,
    headerLabel: "Fragmen",
  },
  sinopsis: {
    title: "Senarai Sinopsis",
    intro: DEFAULT_CATEGORY_INTROS.sinopsis,
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
  const reading = work.readingMinutes ? `± ${work.readingMinutes} minit` : null;
  const published = work.publishedAt;
  const year = (published ?? "2026").slice(0, 4);
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
          {series.hero ? <Image src={series.hero.src} alt={series.hero.alt || `Ilustrasi siri ${series.title}`} fill sizes="(max-width: 680px) 100vw, 360px" /> : <span>{series.title}</span>}
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

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const meta = CATEGORY_META[type];
  if (!meta) return {};
  const intro = isCategoryType(type) ? await categoryIntro(type) : meta.intro;
  return {
    title: meta.title,
    description: intro,
    alternates: { canonical: `/kategori/${type}` },
    openGraph: {
      title: meta.title,
      description: intro,
      url: `/kategori/${type}`
    }
  };
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
  const intro = isCategoryType(type) ? await categoryIntro(type) : meta.intro;

  const isDb =
    (await initContentRepository()).source === "database";

  if (type === "bersiri" && isDb) {
    const repo = await initContentRepository();
    const seriesList = repo.getPublishedSeries();
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
    const aDate = a.publishedAt ?? "";
    const bDate = b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });

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
