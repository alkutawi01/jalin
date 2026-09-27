import type { ReactNode } from "react";
import type { BylineCredit, CharacterMeta, EditorialCredit, WorkMetaRow } from "./types";

const NAV_LINKS: { label: string; href: string; match?: string }[] = [
  { label: "Utama", href: "/" },
  { label: "Cerpen", href: "/kategori/cerpen", match: "cerpen" },
  { label: "Novela", href: "/kategori/novela", match: "novela" },
  { label: "Bersiri", href: "/kategori/bersiri", match: "bersiri" },
  { label: "Fragmen", href: "/kategori/fragmen", match: "fragmen" },
  { label: "Sinopsis", href: "/kategori/sinopsis", match: "sinopsis" }
];

function SiteNav({ active, className }: { active?: string; className: string }) {
  return (
    <nav className={className} aria-label="Navigasi utama">
      {NAV_LINKS.map((link) => (
        <a
          key={link.href}
          className={active && link.match === active ? "active" : undefined}
          href={link.href}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="site-header">
      <div className="site-shell header-inner">
        <a className="header-wordmark" href="/" aria-label="Jalin utama">
          <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
        </a>
        <SiteNav active={active} className="header-nav" />
        <details className="header-mobile-nav">
          <summary>Menu</summary>
          <SiteNav active={active} className="header-mobile-nav-links" />
        </details>
      </div>
    </header>
  );
}

export function StoryHead({
  kicker,
  title,
  dek,
  byline
}: {
  kicker: string;
  title: string;
  dek: string;
  byline: BylineCredit[];
}) {
  return (
    <div className="site-shell story-head">
      <div className="story-kicker">{kicker}</div>
      <h1>{title}</h1>
      <p className="dek">{dek}</p>
      {byline.length > 0 && (
        <div className="byline">
          <span>Oleh</span>
          {byline.map((credit, index) => (
            <span key={credit.name} className="byline-credit">
              {credit.href ? (
                <a href={credit.href}>
                  {credit.name}
                  {credit.maya ? <span className="maya-label"> · Maya</span> : null}
                </a>
              ) : (
                <span className="byline-name">
                  {credit.name}
                  {credit.maya ? <span className="maya-label"> · Maya</span> : null}
                </span>
              )}
              {index < byline.length - 1 ? <span className="byline-separator">&amp;</span> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorialImage({
  src,
  alt,
  rights,
  kind = "inline"
}: {
  src: string;
  alt: string;
  rights: string;
  kind?: "hero" | "inline";
}) {
  const figureClass = (kind === "hero" ? "hero-figure" : "inline-figure") + " editorial-image";
  if (!src) return null;
  return (
    <figure className={figureClass}>
      <img src={src} alt={alt} />
      <div className="image-rights" aria-hidden="true">{rights}</div>
    </figure>
  );
}

export function LeftRail({ rows, note, children }: { rows: WorkMetaRow[]; note?: string; children?: ReactNode }) {
  return (
    <aside className="left-rail">
      <div className="rail-card sticky">
        <div className="rail-label">Tentang karya</div>
        <dl>
          {rows.map((row) => (
            <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
          ))}
        </dl>
        {note ? <>
          <div className="rail-rule" />
          <p className="maya-note">{note}</p>
        </> : null}
      </div>
      {children ? <div className="rail-card sticky">{children}</div> : null}
    </aside>
  );
}

export function RightRail({ characters, editorial }: { characters: CharacterMeta[]; editorial: EditorialCredit[] }) {
  if (characters.length === 0 && editorial.length === 0) return null;
  return (
    <aside className="right-rail">
      <div className="rail-card sticky">
        {characters.length > 0 && (
          <>
            <div className="rail-label">Watak</div>
            {characters.map((character) => (
              <div className="rail-person" key={character.name}>
                <b>{character.name}</b><span>{character.role}</span>
              </div>
            ))}
          </>
        )}
        {characters.length > 0 && editorial.length > 0 && <div className="rail-rule" />}
        {editorial.length > 0 && (
          <>
            <div className="rail-label">Editorial</div>
            {editorial.map((credit) => (
              <div className="editorial-meta" key={credit.role + "-" + credit.name}>
                <span>{credit.role}</span><b>{credit.name}</b>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

export function StoryEnd({ title }: { title: string }) {
  return (
    <div className="site-shell story-end">
      <span>Tamat</span><div className="end-rule" /><p>{title} · Jalin</p>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-inner">
        <img className="footer-logo" src="/brand/jalin-logo-primary.svg" alt="Jalin — oleh Adjung" />
      </div>
    </footer>
  );
}
