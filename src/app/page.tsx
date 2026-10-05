import type { Metadata } from "next";
import { smartQuotes } from "../lib/admin/smart-quotes";
import Image from "next/image";
import { SiteFooter, SiteHeader } from "../components/reader/StoryChrome";
import { WorkCover } from "../components/reader/WorkCover";
import { initContentRepository } from "../lib/content";
import { displayableGenre } from "../lib/reader/genre-display";
import { getAllWorks } from "../lib/content/workLoader";
import { getEditorPickSummaries } from "../lib/reader/editor-picks";
import {
  projectPublicFeaturedSummary,
  projectPublicWorkSummary,
  type PublicFeaturedSummary,
  type PublicWorkSummary
} from "../lib/reader/public-projection";
import { renderAttribution } from "@/components/reader/Attribution";
import { cropStyle } from "../lib/reader/crop";

export const dynamic = "force-dynamic";

// Only the home page says it is the home page; every other page sets its own canonical.
export const metadata: Metadata = { alternates: { canonical: "/" } };

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

function workEyebrow(work: Pick<PublicWorkSummary, "type" | "genre">): string {
  const type = TYPE_LABELS[work.type] ?? work.type;
  const genre = displayableGenre(work.genre);
  return genre ? `${type} · ${genre}` : type;
}

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

function FeaturedHero({ work }: { work: PublicFeaturedSummary }) {
  const hero = work.hero;

  return (
    <section className="hero-featured">
      <div className="site-shell">
        <div className={`hero-featured-inner${hero?.src ? "" : " hero-featured-text-only"}`}>
          <div className="hero-featured-text">
            <p className="home-eyebrow hero-featured-kicker">{workEyebrow(work)}</p>
            <h1 className="hero-featured-title" style={{ fontStyle: "normal" }}>{work.title}</h1>
            {work.attribution ? <p className="work-attribution hero-featured-attribution">{renderAttribution(work.attribution.primary)}</p> : null}
            {work.dek ? <p className="hero-featured-dek">{smartQuotes(work.dek)}</p> : null}
            <WorkMeta work={work} variant="pills" />
            <a className="home-action-primary hero-featured-cta" href={`/kategori/${work.type}/${work.slug}`}>
              Baca sekarang
            </a>
          </div>
          {hero?.src ? (
            <div className="hero-featured-visual">
              <Image src={hero.src} alt={hero.alt} fill // The picture fills a taller, narrower box than its own shape (object-fit: cover), so it is drawn wider than the box:
                // about 1.5 times the box on desktop and over twice on a phone. sizes states the drawn width, not the box width.
                sizes="(max-width: 680px) 750px, (max-width: 1050px) 100vw, 1000px" quality={85} priority style={cropStyle(hero.crop)} />
              <div className="image-rights" aria-hidden="true">{`© ADJUNG ${(work.updatedAt ?? work.publishedAt ?? "2026").slice(0, 4)}`}</div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function yearOf(work: { updatedAt?: string; publishedAt?: string }): string {
  return (work.updatedAt ?? work.publishedAt ?? "2026").slice(0, 4);
}

function LatestWorkCard({ work }: { work: PublicWorkSummary }) {
  return (
    <article className="latest-card">
      <a href={`/kategori/${work.type}/${work.slug}`}>
        <div className="latest-card-cover">
          <WorkCover type={work.type} title={work.title} hero={work.hero} rightsYear={yearOf(work)} />
        </div>
        <div className="latest-card-body">
          <div className="latest-card-meta">
            <span className="home-eyebrow latest-card-type">{workEyebrow(work)}</span>
          </div>
          <h3 className="latest-card-title" style={{ fontStyle: "normal" }}>{work.title}</h3>
          {work.attribution ? <p className="work-attribution">{renderAttribution(work.attribution.primary)}</p> : null}
          {work.attribution?.secondary ? <p className="work-attribution-source">{renderAttribution(work.attribution.secondary)}</p> : null}
          {work.dek ? <p className="latest-card-dek">{work.dek}</p> : null}
          <WorkMeta work={work} />
          <div className="latest-card-footer">
            <span className="home-action-text latest-card-cta">Baca sekarang</span>
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

function EditorialSelection({ works }: { works: PublicWorkSummary[] }) {
  if (works.length === 0) return null;

  return (
    <section className="editorial-selection">
      <div className="site-shell">
        <header className="section-head">
          <h2>Pilihan Editor</h2>
          <p className="section-sub">Karya-karya yang diketengahkan oleh pasukan editorial</p>
        </header>
        <div className="editorial-grid">
          {works.map((work) => (
            <a key={work.slug} href={`/kategori/${work.type}/${work.slug}`} className="editorial-pick">
              <WorkCover type={work.type} title={work.title} hero={work.hero} rightsYear={yearOf(work)} sizes="(max-width: 680px) 100vw, 360px" quality={85} />
              <div className="editorial-pick-body">
                <span className="home-eyebrow editorial-pick-type">{workEyebrow(work)}</span>
                <h3 style={{ fontStyle: "normal" }}>{work.title}</h3>
                {work.attribution ? <p className="work-attribution">{renderAttribution(work.attribution.primary)}</p> : null}
                {work.dek ? <p>{work.dek}</p> : null}
                <WorkMeta work={work} />
                <span className="home-action-text editorial-pick-cta">Baca sekarang</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

interface SeriesHighlightData {
  slug: string;
  title: string;
  genre?: string;
  hero?: { src: string; alt: string };
  first: { slug: string; position: number };
  latest: { slug: string; position: number; title: string };
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
      year: "2026",
    };
  }
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
      genre: series.genre,
      hero: series.hero,
      first: { slug: ordered[0]!.slug, position: ordered[0]!.position },
      latest: { slug: latest.slug, position: latest.position, title: latest.title },
      year: (at || "2026").slice(0, 4),
      at
    };
  }
  return best;
}

function SeriesHighlight({ data }: { data: SeriesHighlightData }) {
  const preview = process.env.NODE_ENV === "development" && process.env.JALIN_PREVIEW_SERIES === "1";
  const base = `${preview ? "https://jalin.adjung.com" : ""}/kategori/bersiri/${data.slug}`;
  const genre = displayableGenre(data.genre);
  return (
    <section className="editorial-selection series-highlight" aria-labelledby="series-highlight-title">
      <div className="site-shell">
        <header className="section-head">
          <h2 id="series-highlight-title">Bersiri</h2>
          <p className="section-sub">Sambungan demi sambungan, satu episod pada satu masa</p>
        </header>
        <article className="series-feature">
          <a className="series-feature-media" href={base}>
            {data.hero ? (
              <>
                <Image src={data.hero.src} alt={data.hero.alt || `Ilustrasi siri ${data.title}`} fill sizes="(max-width: 700px) 100vw, (max-width: 924px) calc(100vw - 64px), 860px" />
                <span className="image-rights" aria-hidden="true">© ADJUNG {data.year}</span>
              </>
            ) : null}
            <span className="series-feature-overlay">
              <span className="home-eyebrow series-feature-meta">Bersiri{genre ? ` · ${genre}` : ""}</span>
              <h3 className="series-feature-title">{data.title}</h3>
            </span>
          </a>
          <div className="series-feature-footer">
            <p className="series-feature-latest">Episod terkini: <strong>Episod {data.latest.position} — {data.latest.title}</strong></p>
            <div className="series-feature-actions">
              <a className="home-action-primary hero-featured-cta" href={`${base}/${data.first.slug}`}>Baca sekarang</a>
              <a className="home-action-text series-feature-secondary" href={base}>Lihat semua episod</a>
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
  // Series episodes are reached through their series (the flat episode URL does not exist), so they
  // are kept out of the single-work sections and shown by the Bersiri highlight instead.
  const standalone = allWorks.filter((work) => work.type !== "bersiri");
  const sorted = [...standalone].sort(byNewest);
  const sortedAll = [...allWorks].sort(byNewest);
  const editorialPicks = await getEditorPickSummaries(standalone);
  const seriesHighlight = await getSeriesHighlight();

  const featured = sorted[0] ?? null;
  // A work appears once: not again as an editor's pick or as the featured work.
  const alreadyShown = new Set<string>([featured?.slug ?? "", ...editorialPicks.map((pick) => pick.slug)]);
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
  if (seriesHighlight?.hero) {
    categoryImages.set("bersiri", { ...seriesHighlight.hero, year: seriesHighlight.year });
  }

  return (
    <>
      <SiteHeader active="home" />

      <main id="kandungan" className="homepage" tabIndex={-1}>
        {featured ? (
          <FeaturedHero work={projectPublicFeaturedSummary(featured)} />
        ) : null}

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

        <EditorialSelection works={editorialPicks} />

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
