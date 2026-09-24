import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../../../components/reader/StoryChrome";
import { initContentRepository } from "../../../../lib/content";

export const dynamicParams = false;

export async function generateStaticParams() {
  const params: { seriesSlug: string }[] = [];
  try {
    const repo = await initContentRepository();
    if (repo.constructor.name === "DatabaseContentRepository") {
      for (const series of repo.getPublishedSeries()) {
        params.push({ seriesSlug: series.slug });
      }
      // Flat episode slugs also generate so the redirect path can run at build time
      // (dynamicParams=false): /kategori/bersiri/[episodeSlug] → nested Series URL.
      for (const work of repo.getWorksByType("bersiri")) {
        if (work.series) {
          params.push({ seriesSlug: work.slug });
        }
      }
    }
  } catch {
    // markdown / no DB
  }
  return params;
}

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

export default async function SeriesLandingPage({
  params
}: {
  params: Promise<{ seriesSlug: string }>;
}) {
  const { seriesSlug } = await params;
  const repo = await initContentRepository();

  // Flat Work route backward compatibility: /kategori/bersiri/[episodeSlug]
  // If slug matches a published episode Work (not a Series), redirect to nested URL.
  if (repo.constructor.name === "DatabaseContentRepository") {
    const series = repo.getSeriesBySlug(seriesSlug);
    if (!series) {
      const work = repo.getWork(seriesSlug);
      if (work && work.type === "bersiri" && work.series) {
        redirect(`/kategori/bersiri/${work.series.slug}/${work.slug}`);
      }
      notFound();
    }

    const episodes = repo.getPublishedSeriesEpisodes(series.id);
    if (episodes.length === 0) notFound();

    const latest = episodes[episodes.length - 1];
    const startSlug = episodes[0]?.slug;

    return (
      <>
        <SiteHeader active="bersiri" />
        <main>
          <div className="site-shell">
            <header className="category-head">
              <p className="category-kicker">
                Bersiri · {MODE_LABELS[series.mode] ?? series.mode}
              </p>
              <h1>{series.title}</h1>
              {series.dek ? <p className="category-intro">{series.dek}</p> : null}
              <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", opacity: 0.75 }}>
                {STATUS_LABELS[series.status] ?? series.status}
                {series.genre ? ` · ${series.genre}` : ""}
                {latest?.publishedAt ? ` · Dikemas kini ${formatDate(latest.publishedAt)}` : ""}
              </p>
            </header>

            {startSlug ? (
              <p style={{ marginBottom: "1.5rem" }}>
                <a
                  className="hero-featured-cta"
                  href={`/kategori/bersiri/${series.slug}/${startSlug}`}
                  style={{ display: "inline-block" }}
                >
                  Mula Membaca
                </a>
              </p>
            ) : null}

            <div className="work-list">
              {episodes.map((episode) => (
                <article key={episode.slug} className="work-card">
                  <a href={`/kategori/bersiri/${series.slug}/${episode.slug}`}>
                    <div className="work-card-meta">
                      <span>Episod {episode.position}</span>
                      {episode.publishedAt ? (
                        <span>{formatDate(episode.publishedAt)}</span>
                      ) : null}
                      {episode.readingMinutes ? (
                        <span>± {episode.readingMinutes} min</span>
                      ) : null}
                    </div>
                    <h2 className="work-card-title">{episode.title}</h2>
                    {episode.dek ? <p className="work-card-dek">{episode.dek}</p> : null}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Markdown fallback: no Series data in markdown source.
  notFound();
}
