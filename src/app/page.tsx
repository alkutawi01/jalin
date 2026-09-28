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

function FeaturedHero({ work }: { work: PublicFeaturedSummary }) {
  const hero = work.hero;
  const label = TYPE_LABELS[work.type] ?? work.type;
  const genre = displayableGenre(work.genre);
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min membaca` : null;

  return (
    <section className="hero-featured">
      <div className="site-shell">
        <div className={`hero-featured-inner${hero?.src ? "" : " hero-featured-text-only"}`}>
          <div className="hero-featured-text">
            <p className="hero-featured-kicker">{genre ? `${label} · ${genre}` : label}</p>
            <h1 className="hero-featured-title">{work.title}</h1>
            {work.dek ? <p className="hero-featured-dek">{work.dek}</p> : null}
            <div className="hero-featured-meta">
              {reading ? <span>{reading}</span> : null}
              <span>{formatDate(work.updatedAt ?? work.publishedAt)}</span>
            </div>
            <a className="hero-featured-cta" href={`/kategori/${work.type}/${work.slug}`}>
              Baca Sekarang
            </a>
          </div>
          {hero?.src ? (
            <div className="hero-featured-visual">
              <Image src={hero.src} alt={hero.alt} fill sizes="(max-width: 900px) 100vw, 640px" priority />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LatestWorkCard({ work }: { work: PublicWorkSummary }) {
  const label = TYPE_LABELS[work.type] ?? work.type;
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  return (
    <article className="latest-card">
      <a href={`/kategori/${work.type}/${work.slug}`}>
        <WorkCover type={work.type} title={work.title} hero={work.hero} />
        <div className="latest-card-meta">
          <span className="latest-card-type">{label}</span>
          {reading ? <span className="latest-card-reading">{reading}</span> : null}
        </div>
        <h3 className="latest-card-title">{work.title}</h3>
        {work.dek ? <p className="latest-card-dek">{work.dek}</p> : null}
        <div className="latest-card-date">
          {formatDate(work.updatedAt ?? work.publishedAt) !== "—"
            ? formatDate(work.updatedAt ?? work.publishedAt)
            : null}
        </div>
      </a>
    </article>
  );
}

function QuickReads({ works }: { works: PublicWorkSummary[] }) {
  if (works.length === 0) return null;
  return (
    <section className="quick-reads">
      <div className="site-shell">
        <header className="section-head">
          <h2>Bacaan Ringkas</h2>
          <p className="section-sub">Untuk masa terhad — kurang daripada 6 minit membaca</p>
        </header>
        <div className="quick-reads-row">
          {works.map((work) => (
            <a
              key={work.slug}
              className="quick-read-card"
              href={`/kategori/${work.type}/${work.slug}`}
            >
              <span>± {work.readingMinutes} min</span>
              <h3>{work.title}</h3>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ type, label }: { type: string; label: string }) {
  return (
    <a href={`/kategori/${type}`} className={`category-explorer-card category-explorer-card--${type}`}>
      <h3>{label}</h3>
      <p>{TYPE_DESCS[type] ?? ""}</p>
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
              <WorkCover type={work.type} title={work.title} hero={work.hero} />
              <div className="editorial-pick-body">
                <span className="editorial-pick-type">
                  {TYPE_LABELS[work.type] ?? work.type}
                  {work.readingMinutes ? ` · ± ${work.readingMinutes} min` : ""}
                </span>
                <h3>{work.title}</h3>
                {work.dek ? <p>{work.dek}</p> : null}
                <span className="editorial-pick-cta">Baca</span>
              </div>
            </a>
          ))}
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
  const [allWorks, editorialPicks] = await Promise.all([getWorks(), getEditorPickSummaries()]);

  const sorted = [...allWorks].sort((a, b) => {
    const aDate = a.updatedAt ?? a.publishedAt ?? "";
    const bDate = b.updatedAt ?? b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  const featured = sorted[0] ?? null;
  const latest = sorted.slice(0, 6);
  const quickReads = sorted
    .filter((work) => (work.readingMinutes ?? 0) > 0 && (work.readingMinutes ?? 0) <= 6)
    .slice(0, 6)
    .map((work) => projectPublicWorkSummary(work));

  return (
    <>
      <SiteHeader />

      <main>
        {featured ? (
          <FeaturedHero work={projectPublicFeaturedSummary(featured)} />
        ) : null}

        <QuickReads works={quickReads} />

        <EditorialSelection works={editorialPicks} />

        <section className="latest-works">
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
        </section>

        <section className="category-explorer">
          <div className="site-shell">
            <header className="section-head">
              <h2>Jelajahi Kategori</h2>
            </header>
            <div className="category-explorer-grid">
              {CATEGORIES.map((cat) => (
                <CategoryCard key={cat.type} type={cat.type} label={cat.label} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
