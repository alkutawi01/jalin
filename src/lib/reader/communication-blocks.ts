import { hasArabic } from "./arabic-text";

export type CommunicationKind = "mesej" | "emel" | "ayat";
export type CommunicationSegment = { kind: "prose"; content: string } | { kind: CommunicationKind; content: string };

/** A small, explicit authoring extension; unmatched delimiters stay ordinary text. */
export function splitCommunicationBlocks(markdown: string): CommunicationSegment[] {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const pattern = /(?:^|\n{2,}):::(mesej|emel|ayat)\n([\s\S]*?)\n:::(?=\n{2,}|$)/g;
  const result: CommunicationSegment[] = [];
  let cursor = 0;
  for (const match of normalized.matchAll(pattern)) {
    const start = match.index;
    if (start > cursor) result.push({ kind: "prose", content: normalized.slice(cursor, start) });
    result.push({ kind: match[1] as CommunicationKind, content: match[2] ?? "" });
    cursor = start + match[0].length;
  }
  if (cursor < normalized.length || result.length === 0) result.push({ kind: "prose", content: normalized.slice(cursor) });
  return result;
}

/** The parts of a verse box (:::ayat), each in the order the reader sees them: the verse, its meaning, its reference. */
export interface AyatParts { verses: string[]; meanings: string[]; references: string[] }

/**
 * Sorts the lines of a verse box by what they are, whatever order they were written in (Izzat, 20 Oct 2026):
 * a line with Arabic letters is the verse; "Maksud:" starts the Malay meaning; "Surah ..." or "Rujukan:" is the reference;
 * any other line without Arabic is taken as the meaning. In a reference, a plain hyphen between two numbers is shown as an en dash
 * (ayat 1-3 becomes 1–3); the meaning is left exactly as written ("hingga" and its own dashes stay).
 */
export function parseAyat(content: string): AyatParts {
  const parts: AyatParts = { verses: [], meanings: [], references: [] };
  for (const raw of content.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (hasArabic(line)) parts.verses.push(line);
    else if (/^Maksud:/i.test(line)) {
      const meaning = line.replace(/^Maksud:\s*/i, "");
      if (meaning) parts.meanings.push(meaning);
    } else if (/^(Surah\s|Rujukan:)/i.test(line)) {
      const reference = line.replace(/^Rujukan:\s*/i, "").replace(/(\d)\s*-\s*(\d)/g, "$1–$2");
      if (reference) parts.references.push(reference);
    } else parts.meanings.push(line);
  }
  return parts;
}
