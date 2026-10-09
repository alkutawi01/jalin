/**
 * Adding a side note without knowing the syntax (Izzat, 9 Okt 2026: "[^1]" and a definition line by hand is too much work).
 * The editor types the note's words, puts the cursor where the number goes, and this works out the rest: the next free number, the
 * reference "[^3]" at the cursor, and the line "[^3]: the words" at the end of the manuscript (which the reader takes out of the text
 * and sets in the margin; see lib/reader/footnotes.ts).
 */

const DEFINITION_LINE = /^ {0,3}\[\^[A-Za-z0-9][A-Za-z0-9_-]{0,39}\]:/;

/** A note is one paragraph: line breaks and runs of spaces become single spaces. */
export function cleanFootnoteText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The smallest number above every numeric label already used (as a reference or a note), so a new note never takes an old one's place. */
export function nextFootnoteLabel(body: string): string {
  let highest = 0;
  for (const match of body.matchAll(/\[\^(\d+)\]/g)) highest = Math.max(highest, Number(match[1]));
  return String(highest + 1);
}

/** Whether a line of the manuscript is a note's definition ("[^1]: ..."). */
export function isFootnoteDefinition(line: string): boolean {
  return DEFINITION_LINE.test(line);
}

export interface InsertedFootnote {
  body: string;
  /** Where the cursor goes: just after the new reference. */
  caret: number;
  label: string;
}

/**
 * Puts a reference at `caret` and the note at the end. A cursor inside the block of notes at the end (or after it) would put the number
 * in a note's own words, so the reference goes at the end of the story's text instead. Returns null when the note has no words.
 */
export function insertFootnote(body: string, caret: number, text: string): InsertedFootnote | null {
  const clean = cleanFootnoteText(text);
  if (!clean) return null;
  const source = body.replace(/\r\n/g, "\n");
  const label = nextFootnoteLabel(source);
  const reference = `[^${label}]`;

  let definitionsStart = -1;
  let offset = 0;
  for (const line of source.split("\n")) {
    if (isFootnoteDefinition(line)) {
      definitionsStart = offset;
      break;
    }
    offset += line.length + 1;
  }
  let at = Math.min(Math.max(Number.isFinite(caret) ? Math.floor(caret) : source.length, 0), source.length);
  if (definitionsStart >= 0 && at > definitionsStart) at = source.slice(0, definitionsStart).trimEnd().length;

  const withReference = source.slice(0, at) + reference + source.slice(at);
  return { body: `${withReference.trimEnd()}\n\n${reference}: ${clean}`, caret: at + reference.length, label };
}
