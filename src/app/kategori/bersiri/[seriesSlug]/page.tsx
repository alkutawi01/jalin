import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { SiteFooter, SiteHeader } from "../../../../components/reader/StoryChrome";
import { WorkCover } from "../../../../components/reader/WorkCover";
import { initContentRepository } from "../../../../lib/content";
import { displayableGenre } from "../../../../lib/reader/genre-display";
import { absoluteUrl } from "../../../../lib/seo";
import { jsonLdString, seriesJsonLd } from "../../../../lib/seo-jsonld";

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

/** Title, description, canonical and share card for a series, so it is not just "Jalin" in a tab or a search result. */
export async function generateMetadata({ params }: { params: Promise<{ seriesSlug: string }> }): Promise<Metadata> {
  const { seriesSlug } = await params;
  const repo = await initContentRepository();
  if (repo.source !== "database") return {};
  const series = repo.getSeriesBySlug(seriesSlug);
  if (!series || repo.getPublishedSeriesEpisodes(series.id).length === 0) return {};
  const description = series.dek ?? `Siri ${series.title} di Jalin.`;
  const path = `/kategori/bersiri/${series.slug}`;
  const image = series.hero?.src ? [{ url: absoluteUrl(series.hero.src) }] : undefined;
  return {
    title: series.title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title: series.title, description, url: path, images: image },
    twitter: { card: image ? "summary_large_image" : "summary", title: series.title, description, images: image?.map((i) => i.url) }
  };
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
        <main id="kandungan" tabIndex={-1}>
          <div className="site-shell">
            <header className={`series-masthead${series.hero ? " series-masthead--hero" : ""}`}>
              <div className="series-masthead-text">
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
              </div>
              {series.hero ? (
                <figure className="series-hero">
                  <Image src={series.hero.src} alt={series.hero.alt} fill sizes="(max-width: 900px) 100vw, 520px" priority />
                  <div className="image-rights" aria-hidden="true">{`© ADJUNG ${(updated || "2026").slice(0, 4)}`}</div>
                </figure>
              ) : null}
            </header>

            <section aria-labelledby="series-episodes">
              <h2 id="series-episodes" className="series-section-title">Episod</h2>
              <ol className="episode-grid">
                {byPosition.map((episode) => {
                  const hero = repo.getWork(episode.slug)?.visuals.find((visual) => visual.role === "hero");
                  const year = (episode.publishedAt ?? "2026").slice(0, 4);
                  return (
                    <li key={episode.slug} className="episode-card">
                      <a href={`${base}/${episode.slug}`}>
                        <div className="episode-card-cover">
                          <WorkCover
                            type="bersiri"
                            title={episode.title}
                            hero={hero?.src ? { src: hero.src, alt: hero.alt ?? "" } : undefined}
                            rightsYear={year}
                            sizes="(max-width: 640px) 100vw, 320px"
                            quality={85}
                          />
                          <span className="episode-card-num" aria-hidden="true">{String(episode.position).padStart(2, "0")}</span>
                        </div>
                        <div className="episode-card-body">
                          <h3 className="episode-card-title">
                            <span className="sr-only">Episod {episode.position}: </span>
                            {episode.title}
                          </h3>
                          {episode.dek ? <p className="episode-card-dek">{episode.dek}</p> : null}
                          <p className="episode-card-meta">
                            {[episode.readingMinutes ? `± ${episode.readingMinutes} minit` : "", episode.publishedAt ? formatDate(episode.publishedAt) : ""]
                              .filter(Boolean)
                              .join(" · ")}
                            <span className="episode-card-arrow" aria-hidden="true"> →</span>
                          </p>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdString(
              seriesJsonLd({
                slug: series.slug,
                title: series.title,
                dek: series.dek,
                genre: displayableGenre(series.genre),
                heroSrc: series.hero?.src,
                episodes: byPosition.map((episode) => ({ slug: episode.slug, title: episode.title, position: episode.position }))
              })
            )
          }}
        />
        <SiteFooter />
      </>
    );
  }

  // Markdown fallback: no Series data in markdown source.
  notFound();
}
