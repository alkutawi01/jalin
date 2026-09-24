import type { BylineCredit, CharacterMeta, EditorialCredit, WorkMetaRow } from "./types";

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="site-header">
      <div className="site-shell header-inner">
        <a className="header-wordmark" href="/" aria-label="Jalin utama">
          <img src="/brand/jalin-wordmark.svg" alt="Jalin" />
        </a>
        <nav aria-label="Navigasi utama">
          <a href="/">Utama</a>
          <a className={active === "cerpen" ? "active" : undefined} href="/kategori/cerpen">Cerpen</a>
          <a className={active === "novela" ? "active" : undefined} href="/kategori/novela">Novela</a>
          <a className={active === "bersiri" ? "active" : undefined} href="/kategori/bersiri">Bersiri</a>
          <a className={active === "terjemahan" ? "active" : undefined} href="/kategori/terjemahan">Terjemahan</a>
          <a className={active === "fragmen" ? "active" : undefined} href="/kategori/fragmen">Fragmen</a>
          <a className={active === "sinopsis" ? "active" : undefined} href="/kategori/sinopsis">Sinopsis</a>
        </nav>
        <button className="save-button" type="button">♡ Simpan</button>
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
      <div className="byline">
        <span>Oleh</span>
        {byline.map((credit, index) => (
          <span key={credit.name} className="byline-credit">
            <a href={credit.href ?? "#"}>
              {credit.name}
              {credit.maya ? <span className="maya-label"> · Maya</span> : null}
            </a>
            {index < byline.length - 1 ? <span className="byline-separator">&amp;</span> : null}
          </span>
        ))}
      </div>
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

export function LeftRail({ rows, note }: { rows: WorkMetaRow[]; note?: string }) {
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
    </aside>
  );
}

export function RightRail({ characters, editorial }: { characters: CharacterMeta[]; editorial: EditorialCredit[] }) {
  return (
    <aside className="right-rail">
      <div className="rail-card sticky">
        <div className="rail-label">Watak</div>
        {characters.map((character) => (
          <div className="rail-person" key={character.name}>
            <b>{character.name}</b><span>{character.role}</span>
          </div>
        ))}
        <div className="rail-rule" />
        <div className="rail-label">Editorial</div>
        {editorial.map((credit) => (
          <div className="editorial-meta" key={credit.role + "-" + credit.name}>
            <span>{credit.role}</span><b>{credit.name}</b>
          </div>
        ))}
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
