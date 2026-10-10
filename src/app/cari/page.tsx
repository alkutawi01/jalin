import type { Metadata } from "next";
import { gateSite } from "../../lib/reader/access-gate";
import { formatMalayDate } from "../../lib/reader/format-date";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { renderAttribution } from "../../components/reader/Attribution";
import { initContentRepository } from "../../lib/content";
import { viewerReach } from "../../lib/reader/access-gate";
import { displayableGenre } from "../../lib/reader/genre-display";
import {
  READING_BANDS,
  QUERY_MAX,
  TYPE_LABELS,
  buildSearchIndex,
  filterOptions,
  restrictForViewer,
  runSearch,
  type Part,
  type SearchParams
} from "../../lib/reader/search";

export const dynamic = "force-dynamic";

// A search page is not something to find through a search engine (thin, endless variations); it is a tool.
export const metadata: Metadata = {
  title: "Cari karya",
  description: "Cari cerpen, novela, bersiri, fragmen dan sinopsis di Jalin.",
  robots: { index: false, follow: true }
};

type Raw = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function Marked({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((part, i) => (part.hit ? <mark key={i} className="search-hit">{part.text}</mark> : <span key={i}>{part.text}</span>))}
    </>
  );
}

function formatDate(date: string): string | null {
  return formatMalayDate(date);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Raw> }) {
  await gateSite();
  const raw = await searchParams;
  const params: SearchParams = {
    q: one(raw.q).slice(0, QUERY_MAX),
    jenis: one(raw.jenis),
    genre: one(raw.genre),
    penulis: one(raw.penulis),
    bacaan: one(raw.bacaan),
    susun: one(raw.susun)
  };
  const repo = await initContentRepository();
  const docs = restrictForViewer(buildSearchIndex(repo), await viewerReach());
  const options = filterOptions(docs);
  const { results, total } = runSearch(docs, params);
  const active = Boolean(params.q?.trim() || params.jenis || params.genre || params.penulis || params.bacaan);

  return (
    <>
      <SiteHeader active="cari" />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell search-page">
          <header className="category-head">
            <p className="category-kicker">Cari</p>
            <h1>Cari karya</h1>
            <p className="category-intro">Cari dalam tajuk, penulis, watak, tempat, istilah dan teks cerita.</p>
          </header>

          <form className="search-form" role="search" action="/cari" method="get">
            <div className="search-field">
              <label htmlFor="cari-q">Kata carian</label>
              <div className="search-field-row">
                <input id="cari-q" name="q" type="search" defaultValue={params.q} maxLength={QUERY_MAX} placeholder="cth. paya, Ahwar, kerusi rotan" autoComplete="off" />
                <button type="submit" className="search-submit">Cari</button>
              </div>
            </div>
            <div className="search-filters">
              <div>
                <label htmlFor="cari-jenis">Jenis</label>
                <select id="cari-jenis" name="jenis" defaultValue={params.jenis ?? ""}>
                  <option value="">Semua jenis</option>
                  {options.types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cari-genre">Genre</label>
                <select id="cari-genre" name="genre" defaultValue={params.genre ?? ""}>
                  <option value="">Semua genre</option>
                  {options.genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cari-penulis">Penulis</label>
                <select id="cari-penulis" name="penulis" defaultValue={params.penulis ?? ""}>
                  <option value="">Semua penulis</option>
                  {options.authors.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cari-bacaan">Tempoh bacaan</label>
                <select id="cari-bacaan" name="bacaan" defaultValue={params.bacaan ?? ""}>
                  <option value="">Mana-mana tempoh</option>
                  {Object.entries(READING_BANDS).map(([key, band]) => <option key={key} value={key}>{band.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cari-susun">Susun</label>
                <select id="cari-susun" name="susun" defaultValue={params.susun ?? ""}>
                  <option value="">Paling berkaitan</option>
                  <option value="terbaru">Terbaru</option>
                </select>
              </div>
            </div>
            <div className="search-actions">
              <button type="submit" className="search-apply">Tapis</button>
              {active ? <a className="search-clear" href="/cari">Kosongkan</a> : null}
            </div>
          </form>

          <p className="search-count" role="status" aria-live="polite">
            {total === 0
              ? "Tiada hasil."
              : params.q?.trim()
                ? `${total} hasil untuk “${params.q.trim()}”.`
                : `${total} karya.`}
            {total > results.length ? ` Menunjukkan ${results.length} yang pertama.` : ""}
          </p>

          {results.length === 0 ? (
            <div className="search-empty">
              <p>Cuba perkataan yang lebih pendek atau buang sebahagian tapisan. Atau jelajahi mengikut jenis:</p>
              <div className="category-empty-links">
                {Object.entries(TYPE_LABELS).map(([type, label]) => <a key={type} href={`/kategori/${type}`}>{label}</a>)}
              </div>
            </div>
          ) : (
            <ol className="search-results">
              {results.map(({ doc, titleParts, snippet }) => {
                const genre = displayableGenre(doc.genre);
                const label = TYPE_LABELS[doc.type] ?? doc.type;
                const date = formatDate(doc.publishedAt);
                return (
                  <li key={`${doc.kind}-${doc.slug}`} className="search-result">
                    <p className="search-result-meta">
                      {genre ? `${label} · ${genre}` : label}
                      {doc.kind === "series" && doc.episodeCount ? ` · ${doc.episodeCount} episod` : ""}
                      {doc.readingMinutes ? ` · ± ${doc.readingMinutes} minit` : ""}
                    </p>
                    <h2 className="search-result-title"><a href={doc.href}><Marked parts={titleParts} /></a></h2>
                    {doc.summary.attribution ? <p className="work-attribution">{renderAttribution(doc.summary.attribution.primary)}</p> : null}
                    {doc.dek ? <p className="search-result-dek">{doc.dek}</p> : null}
                    {snippet ? (
                      <p className="search-snippet">
                        {snippet.label ? <span className="search-snippet-label">{snippet.label} </span> : null}
                        <Marked parts={snippet.parts} />
                      </p>
                    ) : null}
                    {date ? <p className="search-result-date">{date}</p> : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
