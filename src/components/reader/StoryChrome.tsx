import { renderItalics } from "../../lib/reader/inline-italics";
import LilitDivider from "./LilitDivider";
import { capitaliseFirst } from "../../lib/capitalise-first";
import { smartQuotes } from "../../lib/admin/smart-quotes";
import { spacedDashes } from "../../lib/reader/spaced-dash";
import type { ReactNode } from "react";
import Image from "next/image";
import { cropStyle } from "../../lib/reader/crop";
import type { ImageCrop } from "../../lib/content/types";
import type { BylineCredit, CharacterMeta, EditorialCredit, PlaceMeta, WorkMetaRow } from "./types";
import { CONTENT_LINKS, NAV_LINKS, SiteNavLinks, VISITOR_LINKS } from "./nav-links";
import { siteOpenForViewer } from "../../lib/reader/access-gate";
import HeaderSearch from "./HeaderSearch";
import MobileNavMenu from "./MobileNavMenu";
import HeaderAccount from "./HeaderAccount";
import ExpiryNotice from "./ExpiryNotice";
import { readerAccountsEnabled } from "../../lib/reader-auth/enabled";
import AiRating from "./AiRating";
import type { PublicRatingSummary } from "../../lib/panel/public";

function SiteNav({ active, className, visitor = false }: { active?: string; className: string; visitor?: boolean }) {
  return <SiteNavLinks active={active} className={className} links={visitor ? VISITOR_LINKS : NAV_LINKS} />;
}

export async function SiteHeader({ active }: { active?: string }) {
  // Without access (paywall on) the header offers the information pages and the way in; the library is for readers with access.
  const visitor = !(await siteOpenForViewer());
  return (
    <>
    <a className="skip-link" href="#kandungan">Langkau ke kandungan</a>
    <header className="site-header">
      <div className="site-shell header-inner">
        <div className="header-brand">
          <a className="header-wordmark" href="/" aria-label="Jalin utama">
            <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
          </a>
        </div>
        <div className="header-main">
          <SiteNav active={active} className="header-nav" visitor={visitor} />
          {visitor ? null : <HeaderSearch active={active === "cari"} />}
          {readerAccountsEnabled() ? <HeaderAccount /> : null}
        </div>
        <MobileNavMenu active={active} accounts={readerAccountsEnabled()} visitor={visitor} />
      </div>
    </header>
    {readerAccountsEnabled() ? <ExpiryNotice /> : null}
    </>
  );
}

/** "Oleh Nara Zahin & Rafiq Naim": who wrote it (no "Maya" label; Izzat removed it, 6 Oct 2026). One markup for a story, a chapter and a series. */
export function BylineRow({ byline }: { byline: BylineCredit[] }) {
  if (byline.length === 0) return null;
  return (
    <div className="byline">
      <span>Oleh</span>
      {byline.map((credit, index) => (
        <span key={credit.name} className="byline-credit">
          {credit.href ? (
            <a href={credit.href}>
              {credit.name}
            </a>
          ) : (
            <span className="byline-name">
              {credit.name}
            </span>
          )}
          {index < byline.length - 1 ? <span className="byline-separator">&amp;</span> : null}
        </span>
      ))}
    </div>
  );
}

export function StoryHead({
  kicker,
  title,
  dek,
  byline,
  originalTitle,
  originalAuthorBesideTitle,
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
  /**
   * A sinopsis or fragmen is written by Jalin, so "Oleh X" under it would read as if X wrote the synopsis. The original author's name
   * goes beside the original title instead (or takes its place when the work has no separate original title, e.g. a Malay original).
   */
  originalAuthorBesideTitle?: boolean;
  /** Hero image shown as a card beside the title (below it on narrow screens). */
  hero?: { src: string; alt: string; rights: string; crop?: ImageCrop };
}) {
  const text = (
    <>
      <div className="story-kicker">{kicker}</div>
      <h1 style={{ fontStyle: "normal" }}>{title}</h1>
      {originalAuthorBesideTitle ? (
        originalTitle || byline.length > 0 ? (
          <p className="story-original-title">
            {originalTitle ? <cite>{originalTitle}</cite> : null}
            {originalTitle && byline.length > 0 ? " · " : null}
            {byline.length > 0 ? <span className="story-original-author">{byline.map((credit) => credit.name).join(" & ")}</span> : null}
          </p>
        ) : null
      ) : originalTitle ? (
        <p className="story-original-title"><cite>{originalTitle}</cite></p>
      ) : null}
      <p className="dek">{spacedDashes(smartQuotes(dek))}</p>
      {contextLine ? <p className="story-context-line">{contextLine}</p> : null}
      {originalAuthorBesideTitle ? null : <BylineRow byline={byline} />}
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

/** The left rail: about the work, then who made it (editorial). It starts level with the first paragraph, not with the page header. */
export function LeftRail({ rows, note, editorial = [], aiRating, children }: { rows: WorkMetaRow[]; note?: string; editorial?: EditorialCredit[]; aiRating?: { workId: string; summary: PublicRatingSummary }; children?: ReactNode }) {
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
          <p className="maya-note">{renderItalics(note)}</p>
        </> : null}
        {editorial.length > 0 && (
          <>
            <div className="rail-rule" />
            <div className="rail-label">Penyuntingan</div>
            {editorial.map((credit) => (
              <div className="editorial-meta" key={credit.role + "-" + credit.names.join("|")}>
                <span>{credit.role}</span>
                {credit.names.map((name) => <b key={name}>{name}</b>)}
              </div>
            ))}
          </>
        )}
        {aiRating ? (
          <>
            <div className="rail-rule" />
            <div className="rail-label">Penilaian</div>
            <AiRating workId={aiRating.workId} summary={aiRating.summary} />
          </>
        ) : null}
      </div>
      {children ? <div className="rail-card sticky">{children}</div> : null}
    </aside>
  );
}

/** The right rail: who is in the story (Watak) and where it happens (Latar tempat). Level with the first paragraph. */
export function RightRail({ characters, places = [], times = [], info }: { characters: CharacterMeta[]; places?: PlaceMeta[]; times?: PlaceMeta[]; info?: ReactNode }) {
  if (characters.length === 0 && places.length === 0 && times.length === 0) return null;
  return (
    <aside className="right-rail" aria-label="Watak, latar tempat dan latar masa">
      <div className="rail-card sticky">
        {/* On a tablet the left column is gone; its "Tentang karya" button sits here, above Watak, and stays in view as the card sticks. */}
        {info ? <div className="rail-info">{info}</div> : null}
        {characters.length > 0 && (
          <>
            <div className="rail-label">Watak</div>
            {characters.map((character) => (
              <div className="rail-person" key={character.name}>
                <b>{renderItalics(character.name)}</b><span>{renderItalics(capitaliseFirst(character.role))}</span>
              </div>
            ))}
          </>
        )}
        {characters.length > 0 && places.length > 0 && <div className="rail-rule" />}
        {places.length > 0 && (
          <>
            <div className="rail-label">Latar tempat</div>
            {places.map((place) => (
              <div className="rail-person" key={place.name}>
                <b>{renderItalics(place.name)}</b>{place.description ? <span>{renderItalics(place.description)}</span> : null}
              </div>
            ))}
          </>
        )}
        {(characters.length > 0 || places.length > 0) && times.length > 0 && <div className="rail-rule" />}
        {times.length > 0 && (
          <>
            <div className="rail-label">Latar masa</div>
            {times.map((time) => (
              <div className="rail-person" key={time.name}>
                <b>{renderItalics(time.name)}</b>{time.description ? <span>{renderItalics(time.description)}</span> : null}
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
      <h2 id="editor-note-title">Catatan penyunting</h2>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{renderItalics(paragraph)}</p>
      ))}
    </aside>
  );
}

/** The mark at the end of a text: "Tamat", or "Bersambung" under the newest episode of a series that is still going on. */
export function StoryEnd({ title, label = "Tamat" }: { title: string; label?: string }) {
  return (
    <div className="site-shell story-end">
      <span>{label}</span><div className="end-rule"><LilitDivider /></div><p><span style={{ fontStyle: "normal" }}>{title}</span> · Jalin</p>
    </div>
  );
}

const FOOTER_EXPLORE = CONTENT_LINKS;
const FOOTER_ABOUT = [
  { label: "Editorial", href: "/editorial" },
  { label: "Tentang Kami", href: "/tentang" },
  { label: "Dasar privasi", href: "/privasi" },
  { label: "Terma penggunaan", href: "/terma" }
];

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const visitor = !(await siteOpenForViewer());
  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div className="footer-brand">
          <img className="footer-logo" src="/brand/jalin-logo-reversed.svg" alt="Jalin — oleh Adjung" />
          <p className="footer-tagline">Selami dunia melalui cerita</p>
        </div>
        <div className="footer-nav-grid">
          {visitor ? null : (
            <nav className="footer-col" aria-label="Terokai karya">
              <h2>Terokai</h2>
              <ul>
                {FOOTER_EXPLORE.map((link) => (
                  <li key={link.href}><a href={link.href}>{link.label}</a></li>
                ))}
              </ul>
            </nav>
          )}
          <nav className="footer-col" aria-label="Tentang tapak">
            <h2>Jalin</h2>
            <ul>
              {FOOTER_ABOUT.map((link) => (
                <li key={link.href}><a href={link.href}>{link.label}</a></li>
              ))}
              {readerAccountsEnabled() ? <li><a href="/mula">Apa itu Jalin?</a></li> : null}
            </ul>
          </nav>
        </div>
      </div>
      <div className="site-shell footer-base">
        <p>© {year} Adjung Press. Hak cipta terpelihara.</p>
        <a className="footer-admin" href="/admin/login" aria-label="Log masuk pengurus" title="Log masuk pengurus">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
