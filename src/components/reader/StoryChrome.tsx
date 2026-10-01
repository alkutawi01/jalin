import type { ReactNode } from "react";
import Image from "next/image";
import type { BylineCredit, CharacterMeta, EditorialCredit, WorkMetaRow } from "./types";
import { NAV_LINKS, SiteNavLinks } from "./nav-links";
import MobileNavMenu from "./MobileNavMenu";

function SiteNav({ active, className }: { active?: string; className: string }) {
  return <SiteNavLinks active={active} className={className} links={NAV_LINKS} />;
}

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="site-header">
      <div className="site-shell header-inner">
        <a className="header-wordmark" href="/" aria-label="Jalin utama">
          <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
        </a>
        <SiteNav active={active} className="header-nav" />
        <MobileNavMenu active={active} />
      </div>
    </header>
  );
}

export function StoryHead({
  kicker,
  title,
  dek,
  byline,
  originalTitle,
  hero
}: {
  kicker: string;
  title: string;
  dek: string;
  byline: BylineCredit[];
  originalTitle?: string;
  /** Hero image shown as a card beside the title (below it on narrow screens). */
  hero?: { src: string; alt: string; rights: string };
}) {
  const text = (
    <>
      <div className="story-kicker">{kicker}</div>
      <h1>{title}</h1>
      {originalTitle ? <p className="story-original-title">Tajuk asal: <cite>{originalTitle}</cite></p> : null}
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
    </>
  );

  if (!hero?.src) {
    return <div className="site-shell story-head">{text}</div>;
  }

  return (
    <div className="site-shell work-head">
      <div className="story-head work-head-text">{text}</div>
      <figure className="work-head-visual editorial-image">
        <Image src={hero.src} alt={hero.alt} fill sizes="(max-width: 900px) 100vw, 560px" priority />
        <div className="image-rights" aria-hidden="true">{hero.rights}</div>
      </figure>
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
      <Image
        src={src}
        alt={alt}
        fill
        sizes={kind === "hero" ? "(max-width: 720px) 100vw, 1180px" : "(max-width: 720px) 100vw, 800px"}
        priority={kind === "hero"}
      />
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
      <span>Tamat</span><div className="end-rule" /><p><cite>{title}</cite> · Jalin</p>
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
