import type { ContentRepository } from "../content/repository";
import type { Work } from "../content/types";
import { bylineFor } from "./credit-projection";
import { projectPublicWorkSummary, type PublicWorkSummary } from "./public-projection";
import { displayableGenre } from "./genre-display";

/**
 * Search over what readers can read: the published works (title, dek, genre, authors, characters, places, glossary and the text
 * itself; for a novela every chapter, for a series every episode, a series being one result). It runs on the server over the public
 * repository's published copy, so a draft is never found. Nothing is stored or tracked.
 *
 * Text is "folded" one character to one character (lower case, no accents; an apostrophe stays; anything else that is not a letter or a
 * digit becomes a space), so a position in the folded text is the same position in the original: that is how a snippet can show the
 * original words with the matches marked. An apostrophe inside a word is optional for a match ("Sa'd" and "Sad"), a hyphen is a space
 * ("al-Ahwar" and "al Ahwar").
 */

export const RESULT_LIMIT = 50;
export const QUERY_MAX = 100;
export const TOKENS_MAX = 8;

export const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };
export const READING_BANDS = { pendek: { label: "Pendek (15 minit atau kurang)", test: (m: number) => m <= 15 }, sederhana: { label: "Sederhana (16 hingga 30 minit)", test: (m: number) => m > 15 && m <= 30 }, panjang: { label: "Panjang (lebih 30 minit)", test: (m: number) => m > 30 } } as const;
export type ReadingBand = keyof typeof READING_BANDS;

const APOSTROPHES = new Set(["'", "\u2019", "\u2018", "\u02BC", "\u02BF", "\u02BB", "`", "\u00B4"]);

/** Lower case, accents off; an apostrophe stays as "'"; every other non-letter and non-digit is a space. The same length as the input. */
export function fold(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (APOSTROPHES.has(ch)) {
      out += "'";
      continue;
    }
    const base = ch.normalize("NFKD").replace(/\p{M}+/gu, "");
    const one = (base.length === 1 ? base : ch).toLocaleLowerCase("ms");
    out += /[\p{L}\p{N}]/u.test(one) && one.length === 1 ? one : " ";
  }
  return out;
}

export function tokenize(query: string): string[] {
  const words = fold(query.slice(0, QUERY_MAX)).replace(/'/g, "").split(/\s+/).filter(Boolean);
  return [...new Set(words)].slice(0, TOKENS_MAX);
}

const WORD_CHAR = /[\p{L}\p{N}']/u;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The start of a word that begins with the token; an apostrophe may sit between the letters ("sad" finds "sa'd"). */
const wordStart = (token: string) => new RegExp(`(?<![\\p{L}\\p{N}'])${[...token].map(escape).join("'?")}`, "gu");

export interface SearchSection {
  /** "Bab 3: Tajuk" or "Episod 2: Tajuk"; empty for a single text. */
  label: string;
  text: string;
  folded: string;
}

export interface SearchDoc {
  kind: "work" | "series";
  type: string;
  slug: string;
  href: string;
  title: string;
  genre?: string;
  dek?: string;
  authors: string[];
  readingMinutes?: number;
  episodeCount?: number;
  publishedAt: string;
  summary: PublicWorkSummary;
  foldedTitle: string;
  foldedDek: string;
  foldedGenre: string;
  foldedAuthors: string;
  foldedEntities: string;
  sections: SearchSection[];
}

/** The text as a reader sees it: no Markdown marks (headings, emphasis, note references), one line. */
export function readable(markdown: string): string {
  return markdown
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\[\^[^\]]+\]:?/g, "")
    .replace(/\*+/g, "")
    .replace(/(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu, "")
    .replace(/`{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const section = (label: string, markdown: string): SearchSection => {
  const text = readable(markdown);
  return { label, text, folded: fold(text) };
};

function entitiesOf(work: Work): string {
  const names: string[] = [];
  for (const c of work.metadata?.characters ?? []) names.push(c.name, c.role ?? "");
  for (const p of work.metadata?.places ?? []) names.push(p.name, p.description ?? "");
  for (const t of work.metadata?.times ?? []) names.push(t.name, t.description ?? "");
  for (const g of work.glossary ?? []) names.push(g.term);
  return names.filter(Boolean).join(" · ");
}

function authorsOf(work: Work): string[] {
  return bylineFor(work).map((person) => person.name);
}

function docFromWork(work: Work, sections: { slug: string; title?: string; body: string }[]): SearchDoc {
  const parts: SearchSection[] = [];
  if (sections.length > 0) sections.forEach((s, i) => parts.push(section(`Bab ${i + 1}${s.title ? `: ${s.title}` : ""}`, s.body)));
  else parts.push(section("", work.body));
  const entities = entitiesOf(work);
  const authors = authorsOf(work);
  return {
    kind: "work",
    type: work.type,
    slug: work.slug,
    href: `/kategori/${work.type}/${work.slug}`,
    title: work.title,
    ...(work.genre ? { genre: work.genre } : {}),
    ...(work.dek ? { dek: work.dek } : {}),
    authors,
    ...(work.readingMinutes ? { readingMinutes: work.readingMinutes } : {}),
    publishedAt: work.publishedAt ?? "",
    summary: projectPublicWorkSummary(work),
    foldedTitle: fold(work.title),
    foldedDek: fold(work.dek ?? ""),
    foldedGenre: fold(displayableGenre(work.genre) ?? ""),
    foldedAuthors: fold(authors.join(" · ")),
    foldedEntities: fold(entities),
    sections: parts
  };
}

/** Every published work as a search document; the episodes of a series are gathered into one document for the series. */
export function buildSearchIndex(repo: ContentRepository): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const episodeSlugs = new Set<string>();
  for (const series of repo.getPublishedSeries()) {
    const refs = [...repo.getPublishedSeriesEpisodes(series.id)].sort((a, b) => a.position - b.position);
    const episodes = refs
      .map((ref) => ({ ref, work: repo.getEpisodeBySeriesAndSlug(series.slug, ref.slug) }))
      .filter((e): e is { ref: (typeof refs)[number]; work: Work } => Boolean(e.work));
    if (episodes.length === 0) continue;
    episodes.forEach((e) => episodeSlugs.add(e.work.slug));
    const authors = [...new Set(episodes.flatMap((e) => authorsOf(e.work)))];
    const entities = episodes.map((e) => entitiesOf(e.work)).filter(Boolean).join(" · ");
    const latest = [...episodes].sort((a, b) => (b.work.publishedAt ?? "").localeCompare(a.work.publishedAt ?? ""))[0]!.work;
    const first = projectPublicWorkSummary(episodes[0]!.work);
    docs.push({
      kind: "series",
      type: "bersiri",
      slug: series.slug,
      href: `/kategori/bersiri/${series.slug}`,
      title: series.title,
      ...(series.genre ? { genre: series.genre } : {}),
      ...(series.dek ? { dek: series.dek } : {}),
      authors,
      episodeCount: episodes.length,
      publishedAt: latest.publishedAt ?? "",
      summary: { ...first, type: "bersiri", slug: series.slug, title: series.title, ...(series.genre ? { genre: series.genre } : {}), ...(series.dek ? { dek: series.dek } : {}), ...(series.hero ? { hero: { src: series.hero.src, alt: series.hero.alt } } : {}) } as PublicWorkSummary,
      foldedTitle: fold(series.title),
      foldedDek: fold(series.dek ?? ""),
      foldedGenre: fold(displayableGenre(series.genre) ?? ""),
      foldedAuthors: fold(authors.join(" · ")),
      foldedEntities: fold(entities),
      sections: episodes.map((e, i) => section(`Episod ${i + 1}: ${e.ref.title}`, e.work.body))
    });
  }
  for (const work of repo.getWorks()) {
    if (work.type === "bersiri") continue; // reached through its series
    const sections = work.type === "novela" ? repo.getReadingSections(work.id).map((s) => ({ slug: s.slug, title: s.title, body: s.body })) : [];
    docs.push(docFromWork(work, sections));
  }
  return docs;
}

export interface SearchParams {
  q?: string;
  jenis?: string;
  genre?: string;
  penulis?: string;
  bacaan?: string;
  susun?: string;
}

export interface Part {
  text: string;
  hit: boolean;
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
  titleParts: Part[];
  snippet: { label: string; parts: Part[] } | null;
}

/** The text cut into parts, the words of the query marked; the cut is made on the folded text and shown from the original. */
export function highlight(original: string, folded: string, tokens: string[]): Part[] {
  if (tokens.length === 0 || !original) return [{ text: original, hit: false }];
  const marks: [number, number][] = [];
  for (const token of tokens) {
    for (const m of folded.matchAll(wordStart(token))) {
      // the whole word the token starts, so "paya" shows "paya" and "pay" shows "paya"
      let end = m.index + m[0].length;
      while (end < folded.length && WORD_CHAR.test(folded.charAt(end))) end++;
      marks.push([m.index, end]);
    }
  }
  marks.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const mark of marks) {
    const last = merged[merged.length - 1];
    if (last && mark[0] <= last[1]) last[1] = Math.max(last[1], mark[1]);
    else merged.push([...mark]);
  }
  const parts: Part[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: original.slice(cursor, start), hit: false });
    parts.push({ text: original.slice(start, end), hit: true });
    cursor = end;
  }
  if (cursor < original.length) parts.push({ text: original.slice(cursor), hit: false });
  return parts;
}

function countAll(folded: string, token: string): number {
  let n = 0;
  for (const _ of folded.matchAll(wordStart(token))) n++;
  return n;
}

function snippetFor(doc: SearchDoc, tokens: string[]): SearchResult["snippet"] {
  if (tokens.length === 0) return null;
  // the dek when it has the words; else the section with the most of them
  if (tokens.every((t) => countAll(doc.foldedDek, t) > 0) && doc.dek) return null;
  let best: { s: SearchSection; hits: number; first: number } | null = null;
  for (const s of doc.sections) {
    let hits = 0;
    let first = Number.POSITIVE_INFINITY;
    for (const token of tokens) {
      const found = [...s.folded.matchAll(wordStart(token))];
      hits += found.length;
      if (found.length > 0) first = Math.min(first, found[0]!.index);
    }
    if (hits > 0 && (!best || hits > best.hits)) best = { s, hits, first };
  }
  if (!best) return null;
  const from = Math.max(0, best.first - 90);
  const to = Math.min(best.s.text.length, best.first + 150);
  let start = from;
  let end = to;
  if (start > 0) { const space = best.s.text.indexOf(" ", start); if (space !== -1 && space < best.first) start = space + 1; }
  if (end < best.s.text.length) { const space = best.s.text.lastIndexOf(" ", end); if (space > best.first) end = space; }
  const text = (start > 0 ? "… " : "") + best.s.text.slice(start, end).replace(/\s+/g, " ").trim() + (end < best.s.text.length ? " …" : "");
  const folded = fold(text);
  return { label: best.s.label, parts: highlight(text, folded, tokens) };
}

function scoreDoc(doc: SearchDoc, tokens: string[], phrase: string): number {
  let total = 0;
  for (const token of tokens) {
    const inTitle = countAll(doc.foldedTitle, token) > 0;
    const inAuthors = countAll(doc.foldedAuthors, token) > 0;
    const inGenre = countAll(doc.foldedGenre, token) > 0;
    const inDek = countAll(doc.foldedDek, token) > 0;
    const inEntities = countAll(doc.foldedEntities, token) > 0;
    let body = 0;
    for (const s of doc.sections) body += countAll(s.folded, token);
    if (!inTitle && !inAuthors && !inGenre && !inDek && !inEntities && body === 0) return 0; // every word must be found somewhere
    total += (inTitle ? 10 : 0) + (inAuthors ? 6 : 0) + (inEntities ? 5 : 0) + (inGenre ? 4 : 0) + (inDek ? 4 : 0) + Math.min(body, 5);
  }
  if (tokens.length > 1 && phrase) {
    if (doc.foldedTitle.replace(/\s+/g, " ").includes(phrase)) total += 12;
    if (doc.foldedDek.replace(/\s+/g, " ").includes(phrase)) total += 6;
  }
  return total;
}

const clean = (value: string | undefined) => (value ?? "").slice(0, QUERY_MAX).trim();

export function filterDocs(docs: SearchDoc[], params: SearchParams): SearchDoc[] {
  const jenis = clean(params.jenis);
  const genre = fold(clean(params.genre)).trim();
  const penulis = fold(clean(params.penulis)).trim();
  const band = clean(params.bacaan) as ReadingBand;
  return docs.filter((doc) => {
    if (jenis && doc.type !== jenis) return false;
    if (genre && fold(displayableGenre(doc.genre) ?? "").trim() !== genre) return false;
    if (penulis && !doc.authors.some((a) => fold(a).trim() === penulis)) return false;
    if (band && READING_BANDS[band]) {
      if (doc.readingMinutes === undefined || !READING_BANDS[band].test(doc.readingMinutes)) return false;
    }
    return true;
  });
}

export function runSearch(docs: SearchDoc[], params: SearchParams): { results: SearchResult[]; total: number; tokens: string[] } {
  const tokens = tokenize(clean(params.q));
  const phrase = tokens.join(" ");
  const filtered = filterDocs(docs, params);
  const scored: SearchResult[] = [];
  for (const doc of filtered) {
    const score = tokens.length === 0 ? 1 : scoreDoc(doc, tokens, phrase);
    if (score === 0) continue;
    scored.push({ doc, score, titleParts: highlight(doc.title, doc.foldedTitle, tokens), snippet: snippetFor(doc, tokens) });
  }
  const newest = (a: SearchResult, b: SearchResult) => b.doc.publishedAt.localeCompare(a.doc.publishedAt);
  const byNewest = params.susun === "terbaru" || tokens.length === 0;
  scored.sort(byNewest ? newest : (a, b) => b.score - a.score || newest(a, b));
  return { results: scored.slice(0, RESULT_LIMIT), total: scored.length, tokens };
}

/** What the filters can offer, from the works there are (the genres and the authors that exist). */
export function filterOptions(docs: SearchDoc[]): { types: string[]; genres: string[]; authors: string[] } {
  const types = [...new Set(docs.map((d) => d.type))].filter((t) => TYPE_LABELS[t]).sort((a, b) => Object.keys(TYPE_LABELS).indexOf(a) - Object.keys(TYPE_LABELS).indexOf(b));
  // a genre written two ways ("keluarga", "Keluarga") is one entry; the filter itself ignores case
  const seenGenre = new Map<string, string>();
  for (const d of docs) {
    const g = displayableGenre(d.genre);
    if (g && !seenGenre.has(fold(g).trim())) seenGenre.set(fold(g).trim(), g);
  }
  const genres = [...seenGenre.values()].sort((a, b) => a.localeCompare(b, "ms"));
  const authors = [...new Set(docs.flatMap((d) => d.authors))].sort((a, b) => a.localeCompare(b, "ms"));
  return { types, genres, authors };
}
