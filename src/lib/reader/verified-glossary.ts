import type { GlossaryMap } from "../../components/reader/types";
import type { GlossaryEntry, Work } from "../content/types";

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
      glossary[entry.term] = { meaning: entry.meaning };
    }
  }
  return glossary;
}
