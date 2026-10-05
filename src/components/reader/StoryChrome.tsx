import { renderItalics } from "../../lib/reader/inline-italics";
import type { ReactNode } from "react";
import Image from "next/image";
import { cropStyle } from "../../lib/reader/crop";
import type { ImageCrop } from "../../lib/content/types";
import type { BylineCredit, CharacterMeta, EditorialCredit, WorkMetaRow } from "./types";
import { NAV_LINKS, SiteNavLinks } from "./nav-links";
import MobileNavMenu from "./MobileNavMenu";

function SiteNav({ active, className }: { active?: string; className: string }) {
  return <SiteNavLinks active={active} className={className} links={NAV_LINKS} />;
}

export function SiteHeader({ active }: { active?: string }) {
  return (
    <>
    <a className="skip-link" href="#kandungan">Langkau ke kandungan</a>
    <header className="site-header">
      <div className="site-shell header-inner">
        <a className="header-wordmark" href="/" aria-label="Jalin utama">
          <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
        </a>
        <SiteNav active={active} className="header-nav" />
        <MobileNavMenu active={active} />
      </div>
    </header>
    </>
  );
}

export function StoryHead({
  kicker,
  title,
  dek,
  byline,
  originalTitle,
  contextLine,
  hero
}: {
  kicker: ReactNode;
  title: string;
  dek: string;
  byline: BylineCredit[];
  /** A quiet line under the dek, e.g. which episode of which series this is. */
  contextLine?: ReactNode;
  originalTitle?: string;
  /** Hero image shown as a card beside the title (below it on narrow screens). */
  hero?: { src: string; alt: string; rights: string; crop?: ImageCrop };
}) {
  const text = (
    <>
      <div className="story-kicker">{kicker}</div>
      <h1 style={{ fontStyle: "normal" }}>{title}</h1>
      {originalTitle ? <p className="story-original-title"><cite>{originalTitle}</cite></p> : null}
      <p className="dek">{dek}</p>
      {contextLine ? <p className="story-context-line">{contextLine}</p> : null}
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
        {/* The 4:3 box crops a wider picture, so the picture is drawn about 1.33 times the box width: sizes says so. */}
        <Image src={hero.src} alt={hero.alt} fill sizes="(max-width: 900px) 135vw, 760px" quality={85} priority style={cropStyle(hero.crop)} />
        <div className="image-rights" aria-hidden="true">{hero.rights}</div>
      </figure>
    </div>
  );
}

export function EditorialImage({
  src,
  alt,
  rights,
  kind = "inline",
  crop
}: {
  src: string;
  alt: string;
  rights: string;
  kind?: "hero" | "inline";
  crop?: ImageCrop;
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
        quality={85}
        priority={kind === "hero"}
        style={cropStyle(crop)}
      />
      <div className="image-rights" aria-hidden="true">{rights}</div>
    </figure>
  );
}

export function LeftRail({ rows, note, children }: { rows: WorkMetaRow[]; note?: string; children?: ReactNode }) {
  return (
    <aside className="left-rail" aria-label="Tentang karya">
      <div className="rail-card sticky">
        <div className="rail-label">Tentang karya</div>
        <dl>
          {rows.map((row) => (
            <div key={row.label}><dt>{row.label}</dt><dd>{row.italic ? <cite>{row.value}</cite> : row.value}</dd></div>
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
    <aside className="right-rail" aria-label="Watak dan kredit editorial">
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

/** The editor's free-form note at the end of a work. Paragraphs are separated by blank lines; *italic* is honoured. */
export function EditorNote({ note }: { note?: string }) {
  const paragraphs = (note ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <aside className="site-shell editor-note" aria-labelledby="editor-note-title">
      <h2 id="editor-note-title">Catatan Editor</h2>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{renderItalics(paragraph)}</p>
      ))}
    </aside>
  );
}

export function StoryEnd({ title }: { title: string }) {
  return (
    <div className="site-shell story-end">
      <span>Tamat</span><div className="end-rule" /><p><span style={{ fontStyle: "normal" }}>{title}</span> · Jalin</p>
    </div>
  );
}

const FOOTER_EXPLORE = NAV_LINKS.filter((link) => link.match && link.match !== "home");
const FOOTER_ABOUT = [
  { label: "Tentang Jalin", href: "/tentang" },
  { label: "Dasar Privasi", href: "/privasi" },
  { label: "Terma Penggunaan", href: "/terma" }
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div className="footer-brand">
          <img className="footer-logo" src="/brand/jalin-logo-reversed.svg" alt="Jalin — oleh Adjung" />
          <p className="footer-tagline">Cerita untuk kita.</p>
        </div>
        <nav className="footer-col" aria-label="Terokai karya">
          <h2>Terokai</h2>
          <ul>
            {FOOTER_EXPLORE.map((link) => (
              <li key={link.href}><a href={link.href}>{link.label}</a></li>
            ))}
          </ul>
        </nav>
        <nav className="footer-col" aria-label="Tentang tapak">
          <h2>Jalin</h2>
          <ul>
            {FOOTER_ABOUT.map((link) => (
              <li key={link.href}><a href={link.href}>{link.label}</a></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="site-shell footer-base">
        <p>© {year} Adjung Press. Hak cipta terpelihara.</p>
        <p>Karya dan ilustrasi dalam Jalin dilindungi hak cipta.</p>
      </div>
    </footer>
  );
}
