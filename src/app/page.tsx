import type { Metadata } from "next";
import { jsonLdString, siteJsonLd } from "../lib/seo-jsonld";
import { SITE_DESCRIPTION } from "../lib/seo";
import Image from "next/image";
import { SiteFooter, SiteHeader } from "../components/reader/StoryChrome";
import HeroCarousel, { type HeroSlide } from "../components/reader/HeroCarousel";
import StoryCollection from "../components/reader/StoryCollection";
import { initContentRepository } from "../lib/content";
import type { SeriesMeta } from "../lib/content/types";
import type { ImageCrop } from "../lib/content/types";
import { cropStyle } from "../lib/reader/crop";
import { seriesAuthorNames } from "../lib/reader/series-authors";
import { displayableGenre } from "../lib/reader/genre-display";
import { formatMalayDate } from "../lib/reader/format-date";
import { getAllWorks } from "../lib/content/workLoader";
import { getEditorPickSummaries, resolveHeroPicks } from "../lib/reader/editor-picks";
import { projectPublicWorkSummary, type PublicWorkSummary } from "../lib/reader/public-projection";
import { buildStoryPool, pickCollection, workEyebrow } from "../lib/reader/story-collection";
import { homeGrounds, type GroundKey } from "../lib/site-theme";
import HomeStats from "../components/reader/HomeStats";
import { computeSiteStats, statItems } from "../lib/reader/site-stats";

export const dynamic = "force-dynamic";

// Only the home page says it is the home page; every other page sets its own canonical.
export const metadata: Metadata = { alternates: { canonical: "/" } };

function formatDate(date: string | undefined): string {
  return formatMalayDate(date) ?? "—";
}

const TYPE_DESCS: Record<string, string> = {
  cerpen: "Cerita pendek berilustrasi untuk pembaca Jalin",
  novela: "Novela pendek berilustrasi untuk pembaca Jalin",
  bersiri: "Karya bersiri berilustrasi — sambungan demi sambungan",
  fragmen: "Sedutan bermakna daripada karya agung",
  sinopsis: "Penceritaan semula editorial karya lain"
};

const CATEGORIES: { type: string; label: string }[] = [
  { type: "cerpen", label: "Cerpen" },
  { type: "novela", label: "Novela" },
  { type: "bersiri", label: "Bersiri" },
  { type: "fragmen", label: "Fragmen" },
  { type: "sinopsis", label: "Sinopsis" },
];

function readingLabel(minutes: number | undefined): string | null {
  return minutes ? `± ${minutes} minit` : null;
}

function WorkMeta({
  work,
  variant = "line",
}: {
  work: Pick<PublicWorkSummary, "readingMinutes" | "publishedAt">;
  variant?: "line" | "pills";
}) {
  const reading = readingLabel(work.readingMinutes);
  const published = formatDate(work.publishedAt);

  if (!reading && published === "—") return null;

  return (
    <div className={`home-work-meta home-work-meta--${variant}`}>
      {reading ? <span>{reading}</span> : null}
      {published !== "—" ? <span>{published}</span> : null}
    </div>
  );
}

function yearOf(work: { updatedAt?: string; publishedAt?: string }): string {
  return (work.updatedAt ?? work.publishedAt ?? "2026").slice(0, 4);
}

function CategoryCard({
  type,
  label,
  imageSrc,
  imageAlt,
  imageCrop,
}: {
  type: string;
  label: string;
  imageSrc?: string | null;
  imageAlt?: string | null;
  /** The part of the picture its editor chose (the card showed the centre whatever was chosen). */
  imageCrop?: ImageCrop;
}) {
  const hasImage = !!imageSrc;
  return (
    <a
      href={`/kategori/${type}`}
      className={`category-explorer-card category-explorer-card--${type}${hasImage ? " category-explorer-card--photo" : ""}`}
    >
      {hasImage ? (
        <Image
          src={imageSrc!}
          alt={imageAlt ?? ""}
          fill
          sizes="(max-width: 1050px) 45vw, 22vw"
          className="category-explorer-card-img"
          style={cropStyle(imageCrop)}
        />
      ) : null}
      <div className="category-explorer-card-scrim" />
      <div className="category-explorer-card-body">
        <h3>{label}</h3>
        <p>{TYPE_DESCS[type] ?? ""}</p>
        <span className="category-explorer-card-arrow" aria-hidden="true">→</span>
      </div>
    </a>
  );
}

interface SeriesHighlightData {
  slug: string;
  title: string;
  genre?: string;
  hero?: { src: string; alt: string; crop?: ImageCrop };
  first: { slug: string; position: number };
  latest: { slug: string; position: number; title: string; readingMinutes?: number; publishedAt?: string };
  /** Names under the series' title across its published episodes (the series page shows the same names). */
  authors: string[];
  year: string;
}

/** The series with the most recent published episode. Null when no series has a published episode. */
async function getSeriesHighlight(): Promise<SeriesHighlightData | null> {
  // Local design preview only: the Markdown checkout has no Series records.
  if (process.env.NODE_ENV === "development" && process.env.JALIN_PREVIEW_SERIES === "1") {
    return {
      slug: "satu-daerah-yang-paling-sunyi",
      title: "Satu Daerah yang Paling Sunyi",
      genre: "Rumah Tangga",
      hero: { src: "https://hinxqignbwjdoi92.public.blob.vercel-storage.com/assets/visuals/vr-5894790-v1-54cf7d5e.png", alt: "Ilustrasi siri Satu Daerah yang Paling Sunyi" },
      first: { slug: "garing-bukan-hangit", position: 1 },
      latest: { slug: "garing-bukan-hangit", position: 1, title: "Garing, Bukan Hangit" },
      authors: [],
      year: "2026",
    };
  }
  const repo = await initContentRepository();
  let best: (SeriesHighlightData & { at: string }) | null = null;
  for (const series of repo.getPublishedSeries()) {
    const episodes = repo.getPublishedSeriesEpisodes(series.id);
    if (episodes.length === 0) continue;
    const ordered = [...episodes].sort((a, b) => a.position - b.position);
    // "Episod terkini" is the highest-numbered episode, not the one saved last: republishing episode 1 must not make it the newest.
    const latest = ordered[ordered.length - 1]!;
    const newestAt = episodes.reduce((m, e) => ((e.publishedAt ?? "") > m ? (e.publishedAt ?? "") : m), "");
    const latestWork = repo.getEpisodeBySeriesAndSlug(series.slug, latest.slug);
    const latestSummary = latestWork ? projectPublicWorkSummary(latestWork) : undefined;
    const latestHero = latestSummary?.hero;
    const at = newestAt;
    if (best && best.at >= at) continue;
    best = {
      slug: series.slug,
      title: series.title,
      genre: series.genre,
      // The homepage promotes what is new. Prefer the latest episode's scene,
      // while retaining the series artwork as a stable fallback.
      hero: latestHero ?? series.hero,
      first: { slug: ordered[0]!.slug, position: ordered[0]!.position },
      latest: { slug: latest.slug, position: latest.position, title: latest.title, readingMinutes: latestSummary?.readingMinutes, publishedAt: latest.publishedAt },
      authors: seriesAuthorNames(ordered.map((e) => repo.getWork(e.slug)?.credits)),
      year: (at || "2026").slice(0, 4),
      at
    };
  }
  return best;
}

function SeriesHighlight({ data, ground }: { data: SeriesHighlightData; ground: GroundKey }) {
  const preview = process.env.NODE_ENV === "development" && process.env.JALIN_PREVIEW_SERIES === "1";
  const base = `${preview ? "https://jalin.adjung.com" : ""}/kategori/bersiri/${data.slug}`;
  const genre = displayableGenre(data.genre);
  return (
    <section className="editorial-selection series-highlight" data-ground={ground} aria-labelledby="series-highlight-title">
      <div className="site-shell">
        <header className="section-head">
          <h2 id="series-highlight-title">Bersiri</h2>
        </header>
        <article className="series-feature">
          <a className="series-feature-media" href={base}>
            {data.hero ? (
              <>
                <Image src={data.hero.src} alt={data.hero.alt || `Ilustrasi siri ${data.title}`} fill sizes="(max-width: 700px) 100vw, (max-width: 924px) calc(100vw - 64px), 860px" style={cropStyle(data.hero.crop)} />
                <span className="image-rights" aria-hidden="true">© ADJUNG {data.year}</span>
              </>
            ) : null}
            <span className="series-feature-overlay">
              <span className="home-eyebrow series-feature-meta">Bersiri{genre ? ` · ${genre}` : ""}</span>
              <h3 className="series-feature-title">{data.title}</h3>
            </span>
          </a>
          <div className="series-feature-footer">
            {data.authors.length > 0 ? <p className="series-feature-byline">{`Oleh ${data.authors.join(", ")}`}</p> : null}
            <div className="series-feature-latest">
              <span className="home-eyebrow series-feature-latest-label">Episod terkini · Episod {data.latest.position}</span>
              <a className="series-feature-latest-title" href={`${base}/${data.latest.slug}`}>{data.latest.title}</a>
            </div>
            <WorkMeta work={{ readingMinutes: data.latest.readingMinutes, publishedAt: data.latest.publishedAt }} variant="pills" />
            <div className="series-feature-actions">
              <a className="home-action-primary hero-featured-cta" href={base}>Baca sekarang</a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

async function getWorks() {
  const repo = await initContentRepository();
  if (repo.source === "database") {
    return repo.getWorks();
  }
  return getAllWorks();
}

export default async function Home() {
  const allWorks = await getWorks();
  const byNewest = (a: { publishedAt?: string }, b: { publishedAt?: string }) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  const sortedAll = [...allWorks].sort(byNewest);
  // Picks come from every published work: an episode the editor picked is shown as its series (see resolveHeroPicks).
  const pickSummaries = await getEditorPickSummaries(allWorks);
  const pickRepo = await initContentRepository();
  const seriesByEpisode = new Map<string, SeriesMeta>();
  for (const series of pickRepo.getPublishedSeries()) {
    for (const episode of pickRepo.getPublishedSeriesEpisodes(series.id)) seriesByEpisode.set(episode.slug, series);
  }
  const editorialPicks = resolveHeroPicks(pickSummaries, (episodeSlug) => seriesByEpisode.get(episodeSlug));
  const seriesHighlight = await getSeriesHighlight();
  const grounds = await homeGrounds();
  const stats = statItems(computeSiteStats(allWorks, pickRepo.getPublishedSeries().length));

  // The hero is an editorial decision, never an automatic "newest work" slot.
  // Selected works rotate in the same hero presentation; everything else remains eligible for Koleksi cerita.
  const heroSlides: HeroSlide[] = editorialPicks.map((work) => ({
    slug: work.slug,
    type: work.type,
    title: work.title,
    kicker: `Pilihan Editor · ${workEyebrow(work)}`,
    attribution: work.attribution,
    dek: work.dek,
    reading: readingLabel(work.readingMinutes) ?? undefined,
    date: formatDate(work.publishedAt),
    hero: work.hero,
    rights: `© ADJUNG ${yearOf(work)}`,
  }));
  // Koleksi cerita is random on every visit (single works and series episodes), not "the newest".
  const collection = pickCollection(await buildStoryPool());

  const categoryImages = new Map<string, { src: string; alt: string; year: string; crop?: ImageCrop }>();
  for (const cat of CATEGORIES) {
    const withHero = sortedAll.find((work) => {
      const summary = projectPublicWorkSummary(work);
      return summary.type === cat.type && summary.hero?.src;
    });
    if (withHero) {
      const summary = projectPublicWorkSummary(withHero);
      if (summary.hero) categoryImages.set(cat.type, { ...summary.hero, year: yearOf(summary) });
    }
  }
  if (seriesHighlight?.hero) {
    categoryImages.set("bersiri", { ...seriesHighlight.hero, year: seriesHighlight.year });
  }

  return (
    <>
      <SiteHeader active="home" />

      <main id="kandungan" className="homepage" tabIndex={-1}>
        {heroSlides.length > 0 ? <HeroCarousel slides={heroSlides} ground={grounds.hero} /> : null}

        {allWorks.length === 0 ? (
          <section className="site-shell">
            <p className="section-sub">Karya pertama sedang disediakan. Kembali tidak lama lagi.</p>
          </section>
        ) : null}

        <HomeStats stats={stats} ground={grounds.stats} />

        {seriesHighlight ? <SeriesHighlight data={seriesHighlight} ground={grounds.series} /> : null}

        {collection.length > 0 ? <StoryCollection initial={collection} ground={grounds.latest} /> : null}

        <section className="category-explorer" data-ground={grounds.categories}>
          <div className="site-shell">
            <header className="section-head">
              <h2>Terokai kategori</h2>
            </header>
            <div className="category-explorer-grid">
              {CATEGORIES.map((cat) => {
                const img = categoryImages.get(cat.type);
                return (
                  <CategoryCard
                    key={cat.type}
                    type={cat.type}
                    label={cat.label}
                    imageSrc={img?.src}
                    imageCrop={img?.crop}
                    imageAlt={img?.alt}
                  />
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(siteJsonLd(SITE_DESCRIPTION)) }} />

      <SiteFooter />
    </>
  );
}
