import { SiteFooter, SiteHeader } from "../components/reader/StoryChrome";
import { getAllWorks } from "../lib/content";

function formatDate(date: string | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "—";
  const [year, month, day] = date.split("-").map(Number);
  const months = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
}

function MiniWorkCard({ work }: { work: ReturnType<typeof getAllWorks>[number] }) {
  const typeLabels: Record<string, string> = {
    cerpen: "Cerpen",
    novela: "Novela",
    terjemahan: "Terjemahan",
    bersiri: "Bersiri",
    fragmen: "Fragmen",
    sinopsis: "Sinopsis"
  };
  const label = typeLabels[work.type] ?? work.type;
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  return (
    <article className="work-card mini">
      <a href={`/kategori/${work.type}/${work.slug}`}>
        <div className="work-card-meta">
          <span>{label}</span>
          {reading ? <span>{reading}</span> : null}
        </div>
        <h3 className="work-card-title">{work.title}</h3>
        {work.dek ? <p className="work-card-dek">{work.dek}</p> : null}
      </a>
    </article>
  );
}

export default function Home() {
  const allWorks = getAllWorks();
  const latestWorks = [...allWorks].sort((a, b) => {
    const aDate = a.updatedAt ?? a.publishedAt ?? "";
    const bDate = b.updatedAt ?? b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  }).slice(0, 6);

  const categories = [
    { type: "cerpen", label: "Cerpen", desc: "Cerita pendek berilustrasi" },
    { type: "novela", label: "Novela", desc: "Novela pendek berilustrasi" },
    { type: "terjemahan", label: "Terjemahan", desc: "Karya terjemahan berilustrasi" },
    { type: "bersiri", label: "Bersiri", desc: "Karya bersiri berilustrasi" },
  ];

  return (
    <>
      <SiteHeader />

      <main className="landing">
        <section className="hero-section">
          <div className="site-shell">
            <img className="landing-logo" src="/brand/jalin-logo-primary.svg" alt="Jalin — oleh Adjung" />
            <h1 className="hero-tagline">[Tagline pilihan editor]</h1>
            <p className="hero-sub">[Ayat positioning pilihan editor]</p>
          </div>
        </section>

        <section className="site-shell">
          <header className="section-head">
            <h2>Karya Terbaru</h2>
          </header>
          <div className="work-list">
            {latestWorks.map((work) => (
              <MiniWorkCard key={work.slug} work={work} />
            ))}
          </div>
        </section>

        <section className="site-shell">
          <header className="section-head">
            <h2>Pilihan Editor</h2>
          </header>
          <div className="editorial-note">
            <p>[Karya-karya yang diketengahkan oleh editor akan muncul di sini]</p>
          </div>
        </section>

        <section className="site-shell">
          <header className="section-head">
            <h2>Kategori</h2>
          </header>
          <div className="category-grid">
            {categories.map((cat) => (
              <a key={cat.type} href={`/kategori/${cat.type}`} className="category-card">
                <h3>{cat.label}</h3>
                <p>{cat.desc}</p>
              </a>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}