import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { initContentRepository } from "../../../lib/content";
import { getWorksByType } from "../../../lib/content/workLoader";
import type { SeriesMeta, Work, WorkType } from "../../../lib/content/types";
import { notFound } from "next/navigation";

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

function WorkCard({ work, type }: { work: Work; type: string }) {
  const genre = work.genre ?? "Keluarga";
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  const updated = work.updatedAt ?? work.publishedAt;
  return (
    <article className="work-card">
      <a href={`/kategori/${type}/${work.slug}`}>
        <div className="work-card-meta">
          <span>{CATEGORY_META[type]?.headerLabel ?? type} · {genre}</span>
          {reading ? <span>{reading} membaca</span> : null}
        </div>
        <h2 className="work-card-title">{work.title}</h2>
        {work.dek ? <p className="work-card-dek">{work.dek}</p> : null}
        <div className="work-card-updated">
          {formatDate(updated) === "—" ? null : <>Dikemas kini {formatDate(updated)}</>}
        </div>
      </a>
    </article>
  );
}

function SeriesCard({ series, episodeCount }: { series: SeriesMeta; episodeCount: number }) {
  return (
    <article className="work-card">
      <a href={`/kategori/bersiri/${series.slug}`}>
        <div className="work-card-meta">
          <span>
            {MODE_LABELS[series.mode] ?? series.mode}
            {series.genre ? ` · ${series.genre}` : ""}
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

async function getWorks(type: string): Promise<Work[]> {
  const repo = await initContentRepository();
  if (repo.constructor.name === "DatabaseContentRepository") {
    return repo.getWorksByType(type as WorkType);
  }
  return getWorksByType(type as WorkType);
}

export default async function CategoryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const meta = CATEGORY_META[type];
  if (!meta) notFound();

  const isDb =
    (await initContentRepository()).constructor.name === "DatabaseContentRepository";

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
              {seriesList.length === 0 ? <div className="category-empty"><p>Belum ada karya diterbitkan dalam kategori ini.</p></div> : null}
              {seriesList.map((series) => (
                <SeriesCard
                  key={series.id}
                  series={series}
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

          <div className="work-list">
            {works.length === 0 ? <div className="category-empty"><p>Belum ada karya diterbitkan dalam kategori ini.</p></div> : null}
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
