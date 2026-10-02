import type { ReactNode } from "react";

/**
 * Navigation that follows the reader's path:
 *   Homepage > Bersiri > Siri > Episod.
 * Every level has a way back (the breadcrumb at the top), and finishing an episode offers the next one
 * with its title (the continue block at the bottom). There is no navigation bar above the story.
 */

export interface Crumb {
  label: string;
  /** Omit for the current page. */
  href?: string;
}

export function Crumbs({ items }: { items: Crumb[] }): ReactNode {
  return (
    <nav className="crumbs" aria-label="Jejak halaman">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface ContinueTarget {
  href: string;
  /** Small line above the title, e.g. "Episod 3". */
  label: string;
  title: string;
}

/** What the reader can do after finishing: go on, go back one, or back to the series page. */
export function ContinueNav({
  next,
  prev,
  back,
  endNote,
  name
}: {
  next?: ContinueTarget;
  prev?: ContinueTarget;
  /** The series page: the one place that lists every episode. */
  back?: { href: string; label: string };
  /** Shown instead of a next link when there is none. */
  endNote?: string;
  name: string;
}): ReactNode {
  return (
    <nav className="continue-nav" aria-label={name}>
      {next ? (
        <a className="continue-next" href={next.href} rel="next">
          <span className="continue-text">
            <span className="continue-label">Seterusnya · {next.label}</span>
            <span className="continue-title">{next.title}</span>
          </span>
          <span className="continue-arrow" aria-hidden="true">→</span>
        </a>
      ) : endNote ? (
        <p className="continue-end">{endNote}</p>
      ) : null}
      {prev || back ? (
        <div className="continue-secondary">
          {prev ? (
            <a href={prev.href} rel="prev">
              ← {prev.label}: {prev.title}
            </a>
          ) : null}
          {back ? (
            <a href={back.href} rel="up">
              {back.label}
            </a>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
