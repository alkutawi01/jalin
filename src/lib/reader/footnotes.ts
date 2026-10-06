/**
 * Footnotes in a story, written the way Markdown writers already know:
 *
 *   Dia memandang jauh.[^1] Hujan turun lagi.
 *
 *   [^1]: Satu nota oleh editor. Boleh bersambung
 *     pada baris berikutnya yang diinden.
 *
 * A reference is "[^label]"; the note is a line that starts with "[^label]:" and continues on lines indented by at least
 * two spaces. The reader sees a small number in the text and the notes as a numbered list at the end of the chapter (an
 * "end list": a tap on the number jumps to it, with a way back). Notes set in the right margin beside the text are NOT built
 * yet: the right column is taken by the Watak & Latar card, so the layout needs a decision first. Numbers follow the order of the first reference, whatever the labels are, so "[^b]" before "[^a]" is note 1.
 *
 * Nothing is changed in what is stored: the definitions are only taken out of the text for display. A reference with no
 * note, or a note nothing refers to, is left alone (a reference stays as typed; an unused note is not shown) and is
 * reported so the editor can fix it.
 */

export interface Footnote {
  label: string;
  number: number;
  /** The note as Markdown (inline: emphasis and links are fine). */
  text: string;
}

export interface FootnoteResult {
  /** The story without the note definitions, with references still in place as "[^label]". */
  body: string;
  notes: Footnote[];
  /** label -> number, for rendering the references. */
  numbers: Record<string, number>;
  /** References with no note to go with them. */
  missingNotes: string[];
  /** Notes that nothing refers to. */
  unusedNotes: string[];
}

const LABEL = "[A-Za-z0-9][A-Za-z0-9_-]{0,39}";
const DEFINITION = new RegExp(`^ {0,3}\\[\\^(${LABEL})\\]:[ \\t]?(.*)$`);
const REFERENCE = new RegExp(`\\[\\^(${LABEL})\\](?!:)`, "g");

export function extractFootnotes(markdown: string): FootnoteResult {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const definitions = new Map<string, string>();
  const kept: string[] = [];
  let inFence = false;
  let current: { label: string; parts: string[] } | null = null;

  const finish = () => {
    if (current && !definitions.has(current.label)) definitions.set(current.label, current.parts.join("\n").replace(/\n{2,}/g, "\n\n").trim());
    current = null;
  };

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      finish();
      kept.push(line);
      continue;
    }
    if (inFence) {
      kept.push(line);
      continue;
    }
    const start = DEFINITION.exec(line);
    if (start) {
      finish();
      current = { label: start[1]!, parts: [start[2] ?? ""] };
      continue;
    }
    if (current) {
      // A note continues on indented lines (and on blank lines between them).
      if (/^( {2,}|\t)\S/.test(line)) {
        current.parts.push(line.trim());
        continue;
      }
      if (line.trim() === "") {
        current.parts.push("");
        continue;
      }
      finish();
    }
    kept.push(line);
  }
  finish();

  // Body text to scan for references: not inside code, and a reference to a note that exists.
  const body = kept.join("\n").replace(/\n{3,}$/g, "\n\n").replace(/\s+$/, "");
  const order: string[] = [];
  const referenced = new Set<string>();
  const missing = new Set<string>();
  let fence = false;
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    for (const match of line.replace(/`[^`]*`/g, "").matchAll(REFERENCE)) {
      const label = match[1]!;
      if (definitions.has(label)) {
        if (!referenced.has(label)) {
          referenced.add(label);
          order.push(label);
        }
      } else {
        missing.add(label);
      }
    }
  }

  const numbers: Record<string, number> = {};
  const notes: Footnote[] = order.map((label, index) => {
    numbers[label] = index + 1;
    return { label, number: index + 1, text: definitions.get(label) ?? "" };
  });
  const unusedNotes = [...definitions.keys()].filter((label) => !referenced.has(label));
  return { body, notes, numbers, missingNotes: [...missing], unusedNotes };
}

/** The token a reference becomes inside the text handed to the Markdown renderer. It cannot be typed by accident. */
export const FOOTNOTE_TOKEN_OPEN = "⟦fn:";
export const FOOTNOTE_TOKEN_CLOSE = "⟧";
const TOKEN = new RegExp(`${FOOTNOTE_TOKEN_OPEN}(${LABEL}):(\\d+)${FOOTNOTE_TOKEN_CLOSE}`, "g");

/** Marks the references that have a note (others stay as typed) so the renderer can turn them into numbers. */
export function markFootnoteReferences(markdown: string, numbers: Record<string, number>): string {
  if (Object.keys(numbers).length === 0) return markdown;
  let fence = false;
  // Which occurrence of its note each reference is (0 = the first), so only the first can be a "back to the text" target.
  const seen: Record<string, number> = {};
  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fence = !fence;
        return line;
      }
      if (fence) return line;
      return line.replace(REFERENCE, (whole, label: string) => {
        if (!(label in numbers)) return whole;
        const k = seen[label] ?? 0;
        seen[label] = k + 1;
        return `${FOOTNOTE_TOKEN_OPEN}${label}:${k}${FOOTNOTE_TOKEN_CLOSE}`;
      });
    })
    .join("\n");
}

/** Splits a piece of text into plain text and footnote labels, in order. */
export function splitFootnoteTokens(text: string): Array<{ text: string } | { footnote: string; first: boolean }> {
  const parts: Array<{ text: string } | { footnote: string; first: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index! > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ footnote: match[1]!, first: match[2] === "0" });
    last = match.index! + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
