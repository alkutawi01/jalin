import { SiteFooter, SiteHeader } from "../components/reader/StoryChrome";
import { getAllWorks, getWorksByType } from "../lib/content";
import type { Work, WorkType } from "../lib/content/types";

function formatDate(date: string | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "—";
  const [year, month, day] = date.split("-").map(Number);
  const months = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
}

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  terjemahan: "Terjemahan",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

const TYPE_DESCS: Record<string, string> = {
  cerpen: "Cerita pendek berilustrasi untuk jiwa muda",
  bersiri: "Karya bersiri berilustrasi — sambungan demi sambungan",
  terjemahan: "Karya terjemahan berilustrasi dari seluruh dunia",
  fragmen: "Sedutan bermakna daripada karya agung",
  sinopsis: "Penceritaan semula editorial karya lain"
};

const CATEGORIES: { type: string; label: string }[] = [
  { type: "cerpen", label: "Cerpen" },
  { type: "bersiri", label: "Bersiri" },
  { type: "terjemahan", label: "Terjemahan" },
  { type: "fragmen", label: "Fragmen" },
  { type: "sinopsis", label: "Sinopsis" },
];

function FeaturedHero({ work }: { work: Work }) {
  const hero = work.visuals.find((v) => v.role === "hero");
  const label = TYPE_LABELS[work.type] ?? work.type;
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min membaca` : null;

  return (
    <section className="hero-featured">
      <div className="site-shell">
        <div className="hero-featured-inner">
          <div className="hero-featured-text">
            <p className="hero-featured-kicker">{label} · {work.genre ?? "Keluarga"}</p>
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
              <img src={hero.src} alt={hero.alt} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LatestWorkCard({ work }: { work: Work }) {
  const label = TYPE_LABELS[work.type] ?? work.type;
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  return (
    <article className="latest-card">
      <a href={`/kategori/${work.type}/${work.slug}`}>
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

function CategoryCard({ type, label }: { type: string; label: string }) {
  return (
    <a href={`/kategori/${type}`} className="category-explorer-card">
      <h3>{label}</h3>
      <p>{TYPE_DESCS[type] ?? ""}</p>
    </a>
  );
}

function EditorialSelection({ works }: { works: Work[] }) {
  if (works.length === 0) {
    return (
      <section className="editorial-selection">
        <div className="site-shell">
          <header className="section-head">
            <h2>Pilihan Editor</h2>
            <p className="section-sub">Karya-karya yang diketengahkan oleh pasukan editorial</p>
          </header>
          <div className="editorial-empty">
            <p>Karya pilihan akan muncul di sini apabila pasukan editorial memilihnya.</p>
          </div>
        </div>
      </section>
    );
  }

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
              <span className="editorial-pick-type">{TYPE_LABELS[work.type] ?? work.type}</span>
              <h3>{work.title}</h3>
              {work.dek ? <p>{work.dek}</p> : null}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const allWorks = getAllWorks();

  const sorted = [...allWorks].sort((a, b) => {
    const aDate = a.updatedAt ?? a.publishedAt ?? "";
    const bDate = b.updatedAt ?? b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  const featured = sorted[0] ?? null;
  const latest = sorted.slice(0, 6);
  const editorialPicks: Work[] = [];

  return (
    <>
      <SiteHeader />

      <main>
        {featured ? <FeaturedHero work={featured} /> : null}

        <section className="latest-works">
          <div className="site-shell">
            <header className="section-head">
              <h2>Karya Terbaru</h2>
            </header>
            <div className="latest-grid">
              {latest.map((work) => (
                <LatestWorkCard key={work.slug} work={work} />
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

        <EditorialSelection works={editorialPicks} />
      </main>

      <SiteFooter />
    </>
  );
}