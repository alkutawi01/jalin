import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import React, { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";

const visuals = {
  hero: "https://pikaso.cdnpk.net/private/production/5503670371/render.png?token=exp=1790294400~hmac=74fcc5c0b8f73bd9875848af25586012176f93f027a7e8f97e32673c30b08a79",
  notebook: "https://pikaso.cdnpk.net/private/production/5503875125/render.png?token=exp=1790294400~hmac=26e272750ae0ab0ffd738c1815d1de7ddd6b0800e8d07173bab6f24a6a63d876",
  rubberEstate: "https://pikaso.cdnpk.net/private/production/5505649615/render.png?token=exp=1790294400~hmac=616a3c2ce038181c8ef2e6eb4583183320e5896a3c76b5f91fb9697fb33dd37d"
};

const glossary = {
  "kemerosotan kognitif": {
    meaning: "kemerosotan pada keupayaan mental seperti mengingat, memahami atau berfikir.",
    source: "Kamus Dewan / PRPM"
  },
  "diagnosis": {
    meaning: "pengenalpastian sesuatu penyakit berdasarkan tanda dan gejalanya.",
    source: "Kamus Dewan / PRPM"
  },
  "ditoreh": {
    meaning: "digores pada kulit pokok, seperti pokok getah, untuk mendapatkan hasilnya.",
    source: "Kamus Dewan / PRPM"
  },
  "perancah": {
    meaning: "rangka sementara yang dipasang sebagai tempat atau tumpuan semasa kerja binaan.",
    source: "Kamus Dewan / PRPM"
  },
  "penyelia tapak": {
    meaning: "orang yang mengawasi kerja di sesuatu tapak.",
    source: "Kamus Dewan / PRPM"
  },
  "sentimental value": {
    meaning: "nilai perasaan atau kenangan yang melekat pada sesuatu benda.",
    source: "Terjemahan editorial Jalin"
  }
} as const;

function GlossaryTerm({
  term,
  children
}: {
  term: keyof typeof glossary;
  children: ReactNode;
}) {
  const item = glossary[term];
  return (
    <span className="glossary-term" tabIndex={0}>
      {children}
      <span className="glossary-tooltip" role="tooltip">
        <strong>{term}</strong>
        <span>{item.meaning}</span>
        <small>{item.source}</small>
      </span>
    </span>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decorateGlossary(text: string): ReactNode[] {
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(${terms.map(escapeRegExp).join("|")})`,
    "gi"
  );

  return text.split(pattern).map((part, index) => {
    const key = terms.find(
      (term) => term.toLowerCase() === part.toLowerCase()
    );

    if (!key) return part;

    return (
      <GlossaryTerm
        key={`${part}-${index}`}
        term={key as keyof typeof glossary}
      >
        {part}
      </GlossaryTerm>
    );
  });
}
function decorateChildren(children: ReactNode): ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? decorateGlossary(child) : child
  );
}

function StoryMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: () => null,
        p: ({ children }) => <p>{decorateChildren(children)}</p>,
        em: ({ children }) => <em>{decorateChildren(children)}</em>
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export default function KerusiDiBerandaPage() {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "content/drafts/kerusi-di-beranda.md"),
    "utf8"
  );
  const parsed = matter(raw);
  const internalNotesIndex = parsed.content.indexOf("## Nota editorial dalaman");
  const publicStory = (internalNotesIndex >= 0
    ? parsed.content.slice(0, internalNotesIndex)
    : parsed.content
  ).replace(/\n---\s*$/, "").trim();

  const rubberAnchor = "Di hadapan mereka, jalan tanah merah membelah kampung kepada dua. Di sebelah kiri, rumah-rumah baharu berbumbung genting oren. Di sebelah kanan, kebun getah yang sudah tiga tahun tidak ditoreh, pokok-pokoknya berdiri dalam barisan yang semakin dilupakan.";
  const notebookAnchor = "Menjelang senja, Pak Long meminta pen.";

  const [beforeRubber, afterRubber = ""] = publicStory.split(rubberAnchor);
  const [betweenRubberAndNotebook, ending = ""] = afterRubber.split(notebookAnchor);

  return (
    <>
      <header className="site-header">
        <div className="site-shell header-inner">
          <a className="header-wordmark" href="/" aria-label="Jalin utama">
            <img src="/brand/jalin-wordmark-header.svg" alt="Jalin" />
          </a>
          <nav aria-label="Navigasi utama">
            <a href="/">Utama</a>
            <a className="active" href="/cerpen/kerusi-di-beranda">Cerpen</a>
            <a href="#">Novel Pendek</a>
            <a href="#">Bersiri</a>
            <a href="#">Koleksi</a>
          </nav>
          <button className="save-button" type="button">♡ Simpan</button>
        </div>
      </header>

      <main>
        <div className="site-shell story-head">
          <div className="story-kicker">Cerpen · Keluarga</div>
          <h1>Kerusi di Beranda</h1>
          <p className="dek">
            Di sebuah beranda yang menyimpan lebih banyak daripada yang pernah ditanya,
            seorang anak mula menulis sebelum sebahagian cerita keluarganya hilang.
          </p>
          <div className="byline">
            <span>Oleh</span>
            <a href="#">Nara Zahin <b className="maya-badge">Maya</b></a>
            <span>&amp;</span>
            <a href="#">Rafiq Naim <b className="maya-badge">Maya</b></a>
          </div>
        </div>

        <div className="site-shell">
          <figure className="hero-figure">
            <img src={visuals.hero} alt="Kerusi rotan lama di beranda rumah kampung dengan kain lusuh pada tiang kayu." />
          </figure>
        </div>

        <div className="site-shell reading-grid">
          <aside className="left-rail">
            <div className="rail-card sticky">
              <div className="rail-label">Tentang karya</div>
              <dl>
                <div><dt>Bentuk</dt><dd>Cerpen</dd></div>
                <div><dt>Genre</dt><dd>Keluarga</dd></div>
                <div><dt>Bacaan</dt><dd>± 12 min</dd></div>
              </dl>
              <div className="rail-rule" />
              <p className="maya-note"><b>Maya</b> menandakan penulis maya Jalin yang bekerja di bawah kawal selia editorial manusia.</p>
            </div>
          </aside>

          <article className="story-body">
            <StoryMarkdown>{beforeRubber + rubberAnchor}</StoryMarkdown>

            <figure className="inline-figure">
              <img
                src={visuals.rubberEstate}
                alt="Barisan pokok getah lama yang tidak ditoreh, dengan semak mula memenuhi lantai kebun."
              />
            </figure>

            <StoryMarkdown>{betweenRubberAndNotebook}</StoryMarkdown>

            <figure className="inline-figure">
              <img src={visuals.notebook} alt="Tangan tua Pak Long memegang pen di atas buku nota di meja beranda." />
            </figure>

            <StoryMarkdown>{notebookAnchor + ending}</StoryMarkdown>
          </article>

          <aside className="right-rail">
            <div className="rail-card sticky">
              <div className="rail-label">Glosari</div>
              <div className="glossary-item">
                <b>kemerosotan kognitif</b>
                <span>kemerosotan pada keupayaan seperti mengingat, berfikir atau memahami.</span>
              </div>
              <div className="glossary-item">
                <b>ditoreh</b>
                <span>dibuat torehan nipis pada kulit pokok getah supaya lateks dapat mengalir.</span>
              </div>
              <div className="glossary-item">
                <b>perancah</b>
                <span>binaan sementara untuk bekerja di tempat tinggi.</span>
              </div>
              <p className="glossary-hint">Perkataan bertanda halus boleh disentuh atau dihover untuk melihat makna.</p>
            </div>
          </aside>
        </div>

        <div className="site-shell story-end">
          <span>Tamat</span>
          <div className="end-rule" />
          <p>Kerusi di Beranda · Jalin</p>
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-shell footer-inner">
          <img
            className="footer-logo"
            src="/brand/jalin-logo-primary.svg"
            alt="Jalin — oleh Adjung"
          />
        </div>
      </footer>
    </>
  );
}
