import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { getWorksByType } from "../../lib/content";
import type { Work } from "../../lib/content/types";

function formatDate(date: string | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "—";
  const [year, month, day] = date.split("-").map(Number);
  const months = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
}

function WorkCard({ work }: { work: Work }) {
  const genre = work.genre ?? "Keluarga";
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  const updated = work.updatedAt ?? work.publishedAt;
  return (
    <article className="work-card">
      <a href={`/cerpen/${work.slug}`}>
        <div className="work-card-meta">
          <span>Cerpen · {genre}</span>
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

export default function CerpenIndexPage() {
  const works = getWorksByType("cerpen").sort((a, b) => {
    const aDate = a.updatedAt ?? a.publishedAt ?? "";
    const bDate = b.updatedAt ?? b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  return (
    <>
      <SiteHeader active="cerpen" />

      <main>
        <div className="site-shell">
          <header className="category-head">
            <p className="category-kicker">Cerpen</p>
            <h1>Senarai Cerpen</h1>
            <p className="category-intro">
              Cerita pendek berilustrasi untuk pembaca Jalin.
            </p>
          </header>

          <div className="work-list">
            {works.map((work) => (
              <WorkCard key={work.slug} work={work} />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}