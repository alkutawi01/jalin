import type { GlossaryMap } from "../../components/reader/types";
import type { GlossaryEntry, Work } from "../content/types";

/**
 * Verified glossary projection for the public reader.
 *
 * Only entries backed by a verified reference source are shown. Entries
 * without a source, without a meaning, or whose source is not a recognised
 * reference are hidden rather than generated into the reader.
 */

const VERIFIED_SOURCE_PATTERN = /kamus|prpm|editorial jalin/i;

export function isVerifiedGlossaryEntry(entry: GlossaryEntry): boolean {
  if (!entry.term?.trim() || !entry.meaning?.trim() || !entry.source?.trim()) {
    return false;
  }
  return VERIFIED_SOURCE_PATTERN.test(entry.source);
}

export function buildVerifiedGlossary(work: Pick<Work, "glossary">): GlossaryMap {
  const glossary: GlossaryMap = {};
  for (const entry of work.glossary ?? []) {
    if (isVerifiedGlossaryEntry(entry)) {
      glossary[entry.term] = { meaning: entry.meaning, source: entry.source };
    }
  }
  return glossary;
}
