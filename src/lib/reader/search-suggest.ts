import { QUERY_MAX, TYPE_LABELS, runSearch, type SearchDoc } from "./search";

export const SUGGEST_LIMIT = 6;

/** What a suggestion shows: only what is already on a public card (title, kind, who wrote it, where it is). */
export interface Suggestion {
  title: string;
  typeLabel: string;
  authors: string;
  href: string;
}

/** The best few works for what has been typed so far; nothing for a blank or unsearchable query. */
export function suggest(docs: SearchDoc[], query: string): Suggestion[] {
  const q = query.slice(0, QUERY_MAX);
  if (q.trim() === "") return [];
  const { results } = runSearch(docs, { q });
  return results.slice(0, SUGGEST_LIMIT).map(({ doc }) => ({
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
