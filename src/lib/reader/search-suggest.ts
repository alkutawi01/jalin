import { QUERY_MAX, TYPE_LABELS, tokenize, wordStart, type SearchDoc } from "./search";

export const SUGGEST_LIMIT = 6;

/** What a suggestion shows: only what is already on a public card (title, kind, who wrote it, where it is). */
export interface Suggestion {
  title: string;
  typeLabel: string;
  authors: string;
  href: string;
}

/** True when the text has a word that begins with the token. */
const hasWordStart = (text: string, token: string) => wordStart(token).test(text);

/**
 * The best few works for what has been typed so far, by TITLE and AUTHOR only (the box is for finding a work you know;
 * words inside the stories are for the full search page). Every typed word must begin a word in the title or in an author's name.
 * A title that starts with what was typed comes first, then a word in the title, then an author, then the newest.
 */
export function suggest(docs: SearchDoc[], query: string): Suggestion[] {
  const q = query.slice(0, QUERY_MAX);
  if (q.trim() === "") return [];
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  const phrase = tokens.join(" ");
  const scored: { doc: SearchDoc; score: number }[] = [];
  for (const doc of docs) {
    let score = 0;
    let found = true;
    for (const token of tokens) {
      const inTitle = hasWordStart(doc.foldedTitle, token);
      const inAuthors = hasWordStart(doc.foldedAuthors, token);
      if (!inTitle && !inAuthors) {
        found = false;
        break;
      }
      score += (inTitle ? 10 : 0) + (inAuthors ? 6 : 0);
    }
    if (!found) continue;
    if (doc.foldedTitle.replace(/\s+/g, " ").trim().startsWith(phrase)) score += 20;
    scored.push({ doc, score });
  }
  scored.sort((x, y) => y.score - x.score || y.doc.publishedAt.localeCompare(x.doc.publishedAt));
  return scored.slice(0, SUGGEST_LIMIT).map(({ doc }) => ({
    title: doc.title,
    typeLabel: TYPE_LABELS[doc.type] ?? doc.type,
    authors: doc.authors.join(" & "),
    href: doc.href
  }));
}

/** Where "see all results" goes. */
export function allResultsHref(query: string): string {
  const q = query.trim().slice(0, QUERY_MAX);
  return q === "" ? "/cari" : `/cari?q=${encodeURIComponent(q)}`;
}
