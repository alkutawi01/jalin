import type { GlossaryEntry } from "./types";

/** A term compared without case and without the apostrophe or hamza mark ("tasmi'" and "tasmi" are one word). */
export function glossaryKey(term: string): string {
  return term
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0027\u2018\u2019\u02BB\u02BC\u02BE\u02BF\u0060\u00B4]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The glossary a reader sees for an episode of a series: the series' terms plus the episode's own. An episode that defines the same
 * term (a word that means something else there) wins; the rest of the series' terms follow. A term with no text is dropped.
 * The episode's own terms come first, in their own order, so an episode written before the series glossary reads as it did.
 */
export function mergeSeriesGlossary(seriesTerms: GlossaryEntry[] | undefined, episodeTerms: GlossaryEntry[]): GlossaryEntry[] {
  if (!seriesTerms || seriesTerms.length === 0) return episodeTerms;
  const seen = new Set<string>();
  const out: GlossaryEntry[] = [];
  for (const entry of [...episodeTerms, ...seriesTerms]) {
    const key = glossaryKey(entry.term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}
