import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { initContentRepository } from "../../../lib/content";
import { getWorksByType } from "../../../lib/content/workLoader";
import type { Work, WorkType } from "../../../lib/content/types";
import { notFound } from "next/navigation";

const CATEGORY_META: Record<string, { title: string; intro: string; headerLabel: string }> = {
  cerpen: {
    title: "Senarai Cerpen",
    intro: "Cerita pendek berilustrasi untuk pembaca Jalin.",
    headerLabel: "Cerpen",
  },
  novela: {
    title: "Senarai Novela",
    intro: "Novela pendek berilustrasi untuk pembaca Jalin.",
    headerLabel: "Novela",
  },
  terjemahan: {
    title: "Senarai Terjemahan",
    intro: "Karya terjemahan berilustrasi untuk pembaca Jalin.",
    headerLabel: "Terjemahan",
  },
  bersiri: {
    title: "Senarai Bersiri",
    intro: "Karya bersiri berilustrasi untuk pembaca Jalin.",
    headerLabel: "Bersiri",
  },
  fragmen: {
    title: "Senarai Fragmen",
    intro: "Sedutan bermakna daripada karya untuk pembaca Jalin.",
    headerLabel: "Fragmen",
  },
  sinopsis: {
    title: "Senarai Sinopsis",
    intro: "Penceritaan semula editorial karya lain.",
    headerLabel: "Sinopsis",
  },
};

function formatDate(date: string | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "—";
  const [year, month, day] = date.split("-").map(Number);
  const months = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
}

function WorkCard({ work, type }: { work: Work; type: string }) {
  const genre = work.genre ?? "Keluarga";
  const reading = work.readingMinutes ? `± ${work.readingMinutes} min` : null;
  const updated = work.updatedAt ?? work.publishedAt;
  return (
    <article className="work-card">
      <a href={`/kategori/${type}/${work.slug}`}>
        <div className="work-card-meta">
          <span>{CATEGORY_META[type]?.headerLabel ?? type} · {genre}</span>
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

async function getWorks(type: string): Promise<Work[]> {
  const repo = await initContentRepository();
  if (repo.constructor.name === "DatabaseContentRepository") {
    return repo.getWorksByType(type as WorkType);
  }
  return getWorksByType(type as WorkType);
}

export default async function CategoryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const meta = CATEGORY_META[type];
  if (!meta) notFound();

  const works = (await getWorks(type)).sort((a, b) => {
    const aDate = a.updatedAt ?? a.publishedAt ?? "";
    const bDate = b.updatedAt ?? b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  return (
    <>
      <SiteHeader active={type as WorkType} />

      <main>
        <div className="site-shell">
          <header className="category-head">
            <p className="category-kicker">{meta.headerLabel}</p>
            <h1>{meta.title}</h1>
            <p className="category-intro">{meta.intro}</p>
          </header>

          <div className="work-list">
            {works.map((work) => (
              <WorkCard key={work.slug} work={work} type={type} />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
