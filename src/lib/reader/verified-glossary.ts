import type { GlossaryMap } from "../../components/reader/types";
import { capitaliseFirst } from "../capitalise-first";
import type { GlossaryEntry, Work } from "../content/types";
import { stripItalicMarks } from "./inline-italics";

/**
 * Glossary projection for the public reader.
 *
 * Contract (approved): glossary entries are term + meaning only.
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
      glossary[plain] = plain === entry.term ? { meaning } : { meaning, termDisplay: entry.term };
    }
  }
  return glossary;
}
