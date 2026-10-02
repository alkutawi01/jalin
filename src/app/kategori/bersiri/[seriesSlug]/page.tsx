import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../../../components/reader/StoryChrome";
import { initContentRepository } from "../../../../lib/content";
import { displayableGenre } from "../../../../lib/reader/genre-display";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

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
  if (repo.source === "database") {
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

    // First = lowest position. Latest: the last position of a continuous story, the most recent
    // publication of an anthology (where position says nothing about when it came out).
    const byPosition = [...episodes].sort((x, y) => x.position - y.position);
    const first = byPosition[0]!;
    const latest =
      series.mode === "anthology"
        ? [...episodes].sort((x, y) => (y.publishedAt ?? "").localeCompare(x.publishedAt ?? ""))[0]!
        : byPosition[byPosition.length - 1]!;
    const updated = episodes.map((e) => e.publishedAt ?? "").sort().pop() ?? "";
    const base = `/kategori/bersiri/${series.slug}`;
    const meta = [
      MODE_LABELS[series.mode] ?? series.mode,
      STATUS_LABELS[series.status] ?? series.status,
      displayableGenre(series.genre),
      `${episodes.length} episod diterbitkan`,
      updated ? `Dikemas kini ${formatDate(updated)}` : ""
    ].filter(Boolean);

    return (
      <>
        <SiteHeader active="bersiri" />
        <main>
          <div className="site-shell">
            <header className="series-masthead">
              <p className="series-crumb">
                <a href="/kategori/bersiri">Bersiri</a> <span aria-hidden="true">/</span> <span>{series.title}</span>
              </p>
              <h1>{series.title}</h1>
              {series.dek ? <p className="series-premise">{series.dek}</p> : null}
              <p className="series-meta">{meta.join(" · ")}</p>
              <div className="series-actions">
                <a className="series-action series-action--primary" href={`${base}/${first.slug}`}>
                  Mula Episod {first.position}
                </a>
                {latest.slug !== first.slug ? (
                  <a className="series-action" href={`${base}/${latest.slug}`}>
                    Episod terkini <span className="series-action-sub">Episod {latest.position}</span>
                  </a>
                ) : null}
              </div>
            </header>

            <section aria-labelledby="series-episodes">
              <h2 id="series-episodes" className="series-section-title">Episod</h2>
              <ol className="episode-index">
                {byPosition.map((episode) => (
                  <li key={episode.slug} className="episode-row">
                    <a href={`${base}/${episode.slug}`}>
                      <span className="episode-row-num" aria-hidden="true">{String(episode.position).padStart(2, "0")}</span>
                      <span className="episode-row-body">
                        <span className="episode-row-title">
                          <span className="sr-only">Episod {episode.position}: </span>
                          {episode.title}
                        </span>
                        {episode.dek ? <span className="episode-row-dek">{episode.dek}</span> : null}
                        <span className="episode-row-meta">
                          {[episode.readingMinutes ? `± ${episode.readingMinutes} min` : "", episode.publishedAt ? formatDate(episode.publishedAt) : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="episode-row-arrow" aria-hidden="true">→</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Markdown fallback: no Series data in markdown source.
  notFound();
}
