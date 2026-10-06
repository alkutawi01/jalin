import type { GlossaryMap } from "../../components/reader/types";
import { capitaliseFirst } from "../capitalise-first";
import type { GlossaryEntry, Work } from "../content/types";
import { stripItalicMarks } from "./inline-italics";

/**
 * Glossary projection for the public reader.
 *
 * Contract (approved): glossary entries are term + meaning, plus an optional pronunciation and original spelling
 * (with its language) that the editor fills for loanwords.
 * - An entry renders when term and meaning are both present.
 * - `source` (legacy field) is neither required nor displayed.
 * - Provenance is never projected to the reader.
 * - The reader does not verify definitions against any dictionary; that is
 *   editorial responsibility upstream.
 */

export function isVerifiedGlossaryEntry(entry: GlossaryEntry): boolean {
  return Boolean(entry.term?.trim() && entry.meaning?.trim());
}

export function buildVerifiedGlossary(work: Pick<Work, "glossary">): GlossaryMap {
  const glossary: GlossaryMap = {};
  for (const entry of work.glossary ?? []) {
    if (isVerifiedGlossaryEntry(entry)) {
      // Matching uses the plain term; the editor's *italic* marks are only for display.
      const plain = stripItalicMarks(entry.term).trim();
      const meaning = capitaliseFirst(entry.meaning);
      const pronunciation = entry.pronunciation?.trim();
      const original = entry.original?.trim();
      const originalLanguage = entry.originalLanguage?.trim();
      glossary[plain] = {
        meaning,
        ...(plain === entry.term ? {} : { termDisplay: entry.term }),
        ...(pronunciation ? { pronunciation } : {}),
        ...(original ? { original } : {}),
        ...(original && originalLanguage ? { originalLanguage } : {})
      };
    }
  }
  return glossary;
}
