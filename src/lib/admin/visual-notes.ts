/**
 * Side notes inside the visual editor (Izzat, 9 Okt 2026: "how do I edit the note?").
 *
 * In the manuscript a note is a number in a sentence ("[^3]") and a line of words somewhere ("[^3]: ..."). The visual editor shows the number
 * as a small chip in the text, the way a reader sees it, and keeps the words apart: click the chip to read, change or remove the note. This
 * file is the part of that which needs no browser: reading the manuscript into text, chips and notes, and writing them back together.
 *
 * Nothing changes for anyone else: what is saved is still the same manuscript text, so the reader, the preview, the Markdown box and the list
 * of notes read it as before. A note is written back exactly as it was unless it was edited; a note nothing pointed to when the manuscript was
 * opened is kept (it is not the editor's doing); a note whose chip the editor deleted is gone with it.
 */
import { footnoteOverview, splitFootnotes, type FootnoteDefinition } from "./footnote-edit";

const REFERENCE = /\[\^([A-Za-z0-9][A-Za-z0-9_-]{0,39})\]/g;

export interface NoteContext {
  /** label -> the number a reader sees, for every number that has a note. */
  numbers: Record<string, number>;
  /** The first note of each label, as written. Kept while the editor is open, so undoing a deleted chip brings its note back. */
  definitions: Map<string, FootnoteDefinition>;
  /** Labels of notes that nothing pointed to when the manuscript was opened (kept untouched). */
  orphans: string[];
}

export function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The text of the manuscript without its notes, and what is needed to show the numbers and write the notes back. */
export function buildNoteContext(markdown: string): { prose: string; context: NoteContext } {
  const { prose, definitions } = splitFootnotes(markdown);
  const overview = footnoteOverview(markdown);
  const numbers: Record<string, number> = {};
  overview.notes.forEach((note) => {
    numbers[note.label] = note.number;
  });
  const byLabel = new Map<string, FootnoteDefinition>();
  definitions.forEach((definition) => {
    if (!byLabel.has(definition.label)) byLabel.set(definition.label, definition);
  });
  return { prose, context: { numbers, definitions: byLabel, orphans: overview.unused.map((item) => item.label) } };
}

/** One number in the text: a small chip the editor cannot type into, that opens its note when clicked. */
export function noteChipHtml(label: string, number: number, text: string): string {
  const title = text.length > 140 ? `${text.slice(0, 140)}…` : text;
  return `<sup class="visual-manuscript-note" contenteditable="false" tabindex="0" role="button" data-note="${escapeAttribute(label)}" aria-label="Nota ${number}: sunting" title="${escapeAttribute(title)}">${number}</sup>`;
}

/** Turns the numbers in a piece of already-escaped text into chips (a number with no note stays as typed). */
export function withNoteChips(escapedHtml: string, context: NoteContext): string {
  return escapedHtml.replace(REFERENCE, (whole, label: string) => {
    const number = context.numbers[label];
    const definition = context.definitions.get(label);
    return number !== undefined && definition ? noteChipHtml(label, number, definition.text) : whole;
  });
}

/** The notes to write after the text: those whose chip is still in the text (in the order of their first chip), then the untouched leftovers. */
export function notesToWrite(labelsInText: string[], context: NoteContext): string[] {
  const written = new Set<string>();
  const lines: string[] = [];
  for (const label of [...labelsInText, ...context.orphans]) {
    if (written.has(label)) continue;
    const definition = context.definitions.get(label);
    if (!definition) continue;
    written.add(label);
    lines.push(definition.raw);
  }
  return lines;
}

/** The manuscript text again: the prose, then the notes, one blank line between each. */
export function joinProseAndNotes(prose: string, notes: string[]): string {
  if (notes.length === 0) return prose;
  return prose.trim() === "" ? notes.join("\n\n") : `${prose}\n\n${notes.join("\n\n")}`;
}

/** The raw line of a note with new words (one paragraph). */
export function noteWithText(label: string, text: string): FootnoteDefinition {
  const clean = text.replace(/\s+/g, " ").trim();
  return { label, raw: `[^${label}]: ${clean}`, text: clean };
}

/** The labels of the chips in a piece of editor HTML, in order, without repeats (for tests and for the editor). */
export function labelsInHtml(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/data-note="([^"]+)"/g)) if (!found.includes(match[1]!)) found.push(match[1]!);
  return found;
}
