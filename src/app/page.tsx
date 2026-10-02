import Image from "next/image";
import { SiteFooter, SiteHeader } from "../components/reader/StoryChrome";
import { WorkCover } from "../components/reader/WorkCover";
import { initContentRepository } from "../lib/content";
import { displayableGenre } from "../lib/reader/genre-display";
import { getAllWorks } from "../lib/content/workLoader";
import { getEditorPickSummaries } from "../lib/reader/editor-picks";
import {
  projectPublicWorkSummary,
  type PublicWorkSummary
} from "../lib/reader/public-projection";
import { renderAttribution } from "@/components/reader/Attribution";
import HeroCarousel, { type HeroSlide } from "@/components/reader/HeroCarousel";

export const dynamic = "force-dynamic";

function formatDate(date: string | undefined): string {
  if (!date) return "—";
  const day = /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "—";
  const [year, month, dayNum] = day.split("-").map(Number);
  const months = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  return `${dayNum} ${months[(month ?? 1) - 1]} ${year}`;
}

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

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

function yearOf(work: { updatedAt?: string; publishedAt?: string }): string {
  return (work.updatedAt ?? work.publishedAt ?? "2026").slice(0, 4);
}

function LatestWorkCard({ work }: { work: PublicWorkSummary }) {
  const label = TYPE_LABELS[work.type] ?? work.type;
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  return (
    <article className="latest-card">
      <a href={`/kategori/${work.type}/${work.slug}`}>
        <div className="latest-card-cover">
          <WorkCover type={work.type} title={work.title} hero={work.hero} rightsYear={yearOf(work)} />
        </div>
        <div className="latest-card-body">
          <div className="latest-card-meta">
            <span className="latest-card-type">{label}</span>
            {reading ? <span className="latest-card-reading">{reading}</span> : null}
          </div>
          <h3 className="latest-card-title" style={{ fontStyle: "normal" }}>{work.title}</h3>
          {work.attribution ? <p className="work-attribution">{renderAttribution(work.attribution.primary)}</p> : null}
          {work.attribution?.secondary ? <p className="work-attribution-source">{renderAttribution(work.attribution.secondary)}</p> : null}
          {work.dek ? <p className="latest-card-dek">{work.dek}</p> : null}
          <div className="latest-card-footer">
            <span className="latest-card-cta">Baca →</span>
            <span className="latest-card-date">
              {formatDate(work.publishedAt) !== "—"
                ? formatDate(work.publishedAt)
                : null}
            </span>
          </div>
        </div>
      </a>
    </article>
  );
}

function CategoryCard({
  type,
  label,
  imageSrc,
  imageAlt,
}: {
  type: string;
  label: string;
  imageSrc?: string | null;
  imageAlt?: string | null;
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
  dek?: string;
  episodeCount: number;
  first: { slug: string; position: number };
  latest: { slug: string; position: number; title: string };
  year: string;
}

/** The series with the most recent published episode. Null when no series has a published episode. */
async function getSeriesHighlight(): Promise<SeriesHighlightData | null> {
  const repo = await initContentRepository();
  let best: (SeriesHighlightData & { at: string }) | null = null;
  for (const series of repo.getPublishedSeries()) {
    const episodes = repo.getPublishedSeriesEpisodes(series.id);
    if (episodes.length === 0) continue;
    const ordered = [...episodes].sort((a, b) => a.position - b.position);
    const latest = [...episodes].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0]!;
    const at = latest.publishedAt ?? "";
    if (best && best.at >= at) continue;
    best = {
      slug: series.slug,
      title: series.title,
      dek: series.dek,
      episodeCount: episodes.length,
      first: { slug: ordered[0]!.slug, position: ordered[0]!.position },
      latest: { slug: latest.slug, position: latest.position, title: latest.title },
      year: (at || "2026").slice(0, 4),
      at
    };
  }
  return best;
}

function SeriesHighlight({ data }: { data: SeriesHighlightData }) {
  const base = `/kategori/bersiri/${data.slug}`;
  return (
    <section className="editorial-selection series-highlight" aria-labelledby="series-highlight-title">
      <div className="site-shell">
        <header className="section-head">
          <h2 id="series-highlight-title">Bersiri</h2>
          <p className="section-sub">Sambungan demi sambungan, satu episod pada satu masa</p>
        </header>
        <div className="editorial-pick">
          <a href={base} aria-label={`Buka siri ${data.title}`}>
            <WorkCover type="bersiri" title={data.title} />
          </a>
          <div className="editorial-pick-body">
            <span className="editorial-pick-type">Bersiri · {data.episodeCount} episod</span>
            <h3 style={{ fontStyle: "normal" }}><a href={base}>{data.title}</a></h3>
            {data.dek ? <p>{data.dek}</p> : null}
            <p className="work-attribution">Terkini: Episod {data.latest.position} — {data.latest.title}</p>
            <span>
              <a className="editorial-pick-cta" href={`${base}/${data.latest.slug}`}>Baca Episod {data.latest.position}</a>
              {data.first.slug !== data.latest.slug ? (
                <> · <a href={`${base}/${data.first.slug}`}>Mula dari Episod {data.first.position}</a></>
              ) : null}
              {" · "}<a href={base}>Semua episod</a>
            </span>
          </div>
        </div>
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
  // Series episodes are reached through their series (the flat episode URL does not exist), so they
  // are kept out of the single-work sections and shown by the Bersiri highlight instead.
  const standalone = allWorks.filter((work) => work.type !== "bersiri");
  const sorted = [...standalone].sort(byNewest);
  const sortedAll = [...allWorks].sort(byNewest);
  const editorialPicks = await getEditorPickSummaries(standalone);
  const seriesHighlight = await getSeriesHighlight();

  // The hero is the editor's picks (a carousel, newest first). With no picks there is no hero at all.
  const slides: HeroSlide[] = editorialPicks.map((work) => {
    const genre = displayableGenre(work.genre);
    const label = TYPE_LABELS[work.type] ?? work.type;
    return {
      slug: work.slug,
      type: work.type,
      title: work.title,
      kicker: genre ? `${label} · ${genre}` : label,
      ...(work.attribution ? { attribution: work.attribution.primary } : {}),
      ...(work.dek ? { dek: work.dek } : {}),
      ...(work.readingMinutes ? { reading: `± ${work.readingMinutes} min membaca` } : {}),
      date: formatDate(work.publishedAt),
      ...(work.hero ? { hero: { src: work.hero.src, alt: work.hero.alt ?? "" } } : {}),
      rights: `© ADJUNG ${yearOf(work)}`
    };
  });
  // A work appears once: not again among the latest if it is already in the carousel.
  const alreadyShown = new Set<string>(editorialPicks.map((pick) => pick.slug));
  const latest = sorted.filter((work) => !alreadyShown.has(work.slug)).slice(0, 6);

  const categoryImages = new Map<string, { src: string; alt: string; year: string }>();
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

  return (
    <>
      <SiteHeader active="home" />

      <main>
        <h1 className="sr-only">Jalin</h1>
        {slides.length > 0 ? <HeroCarousel slides={slides} /> : null}

        {allWorks.length === 0 ? (
          <section className="site-shell">
            <p className="section-sub">Karya pertama sedang disediakan. Kembali tidak lama lagi.</p>
          </section>
        ) : null}

        {seriesHighlight ? <SeriesHighlight data={seriesHighlight} /> : null}

        {latest.length > 0 ? <section className="latest-works">
          <div className="site-shell">
            <header className="section-head">
              <h2>Karya Terbaru</h2>
            </header>
            <div className="latest-grid">
              {latest.map((work) => (
                <LatestWorkCard
                  key={work.slug}
                  work={projectPublicWorkSummary(work)}
                />
              ))}
            </div>
          </div>
        </section> : null}

        <section className="category-explorer">
          <div className="site-shell">
            <header className="section-head">
              <h2>Jelajahi Kategori</h2>
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
                    imageAlt={img?.alt}
                  />
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
