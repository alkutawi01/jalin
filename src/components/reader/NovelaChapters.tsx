import type { ReactNode } from "react";
import { Crumbs } from "./ReadingNav";
import ChapterPicker from "./ChapterPicker";

export interface ChapterRow {
  slug: string;
  title: string;
  /** Rounded reading minutes for this chapter. */
  minutes: number;
  href: string;
}

/** About 200 words a minute, never less than one minute. */
export function readingMinutesOf(body: string): number {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

/** The head of a chapter page: where the reader is, the chapter's own title and a way to move around. Short on purpose. */
export function ChapterHead({
  workTitle,
  workHref,
  rows,
  index
}: {
  workTitle: string;
  workHref: string;
  rows: ChapterRow[];
  index: number;
}): ReactNode {
  const row = rows[index]!;
  const prev = index > 0 ? rows[index - 1] : undefined;
  const next = index < rows.length - 1 ? rows[index + 1] : undefined;
  return (
    <header className="chapter-head">
      <Crumbs items={[{ label: "Novela", href: "/kategori/novela" }, { label: workTitle, href: workHref }, { label: `Bab ${index + 1}` }]} />
      <p className="story-kicker">Bab {index + 1} daripada {rows.length} · ± {row.minutes} minit</p>
      <h1>{row.title}</h1>
      <div className="chapter-head-nav">
        {prev ? <a href={prev.href} rel="prev">← Bab {index}</a> : <span aria-hidden="true" />}
        <ChapterPicker rows={rows} currentSlug={row.slug} />
        {next ? <a href={next.href} rel="next">Bab {index + 2} →</a> : <span aria-hidden="true" />}
      </div>
    </header>
  );
}

/** The body of a novela's own page: where to start and every chapter. */
export function NovelaIntro({ rows }: { rows: ChapterRow[] }): ReactNode {
  const first = rows[0];
  if (!first) return null;
  return (
    <article className="story-body novela-intro">
      <a className="hero-featured-cta" href={first.href}>Baca sekarang</a>
      <h2 id="senarai-bab">Senarai Bab</h2>
      <ol className="chapter-list" aria-labelledby="senarai-bab">
        {rows.map((row, index) => (
          <li key={row.slug}>
            <a href={row.href}>
              <span className="chapter-num">{index + 1}</span>
              <span className="chapter-ttl">{row.title}</span>
              <span className="chapter-min">± {row.minutes} minit</span>
            </a>
          </li>
        ))}
      </ol>
    </article>
  );
}
