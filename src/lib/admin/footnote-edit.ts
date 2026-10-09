/**
 * Looking after side notes once they exist (Izzat, 9 Okt 2026: "how do I edit the note?"). A note is a reference "[^3]" in a sentence and a
 * line "[^3]: the words" (and any indented lines after it) somewhere in the manuscript; this finds them all, rewrites one note's words and
 * removes a note together with its number, so nobody has to hunt through a long manuscript for the line.
 *
 * It reads notes the way the reader does (lib/reader/footnotes.ts): lines inside a code fence are left alone, a note continues on lines
 * indented by two spaces or a tab, and the number a reader sees follows the order of the first reference, whatever the labels are.
 * The stored text is touched only where a note is (a rewritten note becomes a single line; no other line is reflowed).
 */
import { cleanFootnoteText } from "./footnote-insert";

const LABEL = "[A-Za-z0-9][A-Za-z0-9_-]{0,39}";
const DEFINITION = new RegExp(`^ {0,3}\\[\\^(${LABEL})\\]:[ \\t]?(.*)$`);
const REFERENCE = new RegExp(`\\[\\^(${LABEL})\\](?!:)`, "g");
const FENCE = /^\s*(```|~~~)/;

interface Block {
  label: string;
  /** First line of the note and the line after its last non-blank line. */
  start: number;
  end: number;
  text: string;
}

export interface NoteSummary {
  label: string;
  /** The number a reader sees. */
  number: number;
  text: string;
  /** The words just before the number, to tell notes apart. */
  context: string;
}

export interface FootnoteOverview {
  /** Notes that have both a number in the text and words, in reading order. */
  notes: NoteSummary[];
  /** A number in the text with no note to go with it. */
  missing: { label: string; context: string }[];
  /** Words of a note that no number in the text points to. */
  unused: { label: string; text: string }[];
}

function linesOf(body: string): string[] {
  return body.replace(/\r\n/g, "\n").split("\n");
}

function definitionBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const start = DEFINITION.exec(line);
    if (!start) continue;
    const parts = [start[2] ?? ""];
    let last = i;
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j]!;
      if (/^( {2,}|\t)\S/.test(next)) {
        parts.push(next.trim());
        last = j;
      } else if (next.trim() !== "") break;
    }
    blocks.push({ label: start[1]!, start: i, end: last + 1, text: parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim() });
    i = last;
  }
  return blocks;
}

/** Lines of ordinary text: not inside a code fence and not part of a note. */
function proseLines(lines: string[], blocks: Block[]): number[] {
  const skip = new Set<number>();
  blocks.forEach((block) => {
    for (let i = block.start; i < block.end; i++) skip.add(i);
  });
  const found: number[] = [];
  let fence = false;
  lines.forEach((line, i) => {
    if (FENCE.test(line)) {
      fence = !fence;
      return;
    }
    if (!fence && !skip.has(i)) found.push(i);
  });
  return found;
}

function contextBefore(line: string, index: number): string {
  const before = line
    .slice(0, index)
    .replace(new RegExp(REFERENCE.source, "g"), "")
    .replace(/\[\[gambar:\d+\]\]/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (before.length <= 80) return before;
  const tail = before.slice(-80);
  const space = tail.indexOf(" ");
  return `…${space > 0 && space < 30 ? tail.slice(space + 1) : tail}`;
}

export function footnoteOverview(body: string): FootnoteOverview {
  const lines = linesOf(body);
  const blocks = definitionBlocks(lines);
  const definitions = new Map<string, string>();
  blocks.forEach((block) => {
    if (!definitions.has(block.label)) definitions.set(block.label, block.text);
  });

  const order: { label: string; context: string }[] = [];
  const seen = new Set<string>();
  for (const i of proseLines(lines, blocks)) {
    const line = lines[i]!;
    // A reference inside inline code is only text.
    const scan = line.replace(/`[^`]*`/g, (code) => " ".repeat(code.length));
    for (const match of scan.matchAll(REFERENCE)) {
      const label = match[1]!;
      if (seen.has(label)) continue;
      seen.add(label);
      order.push({ label, context: contextBefore(line, match.index!) });
    }
  }

  const notes: NoteSummary[] = [];
  const missing: FootnoteOverview["missing"] = [];
  order.forEach((reference) => {
    const text = definitions.get(reference.label);
    if (text === undefined) missing.push(reference);
    else notes.push({ label: reference.label, number: notes.length + 1, text, context: reference.context });
  });
  const unused = [...definitions.entries()].filter(([label]) => !seen.has(label)).map(([label, text]) => ({ label, text }));
  return { notes, missing, unused };
}

/**
 * Rewrites the words of a note; adds the note at the end when the reference has none yet. Returns null when there are no words
 * (a note cannot be empty: remove it instead).
 */
export function setFootnoteText(body: string, label: string, text: string): string | null {
  const clean = cleanFootnoteText(text);
  if (!clean) return null;
  const lines = linesOf(body);
  const blocks = definitionBlocks(lines).filter((block) => block.label === label);
  const line = `[^${label}]: ${clean}`;
  if (blocks.length === 0) return `${lines.join("\n").trimEnd()}\n\n${line}`;
  // The first note takes the new words; a repeated one with the same label (the reader ignores it) goes.
  const drop = new Set<number>();
  blocks.slice(1).forEach((block) => {
    for (let i = block.start; i < block.end; i++) drop.add(i);
  });
  const out: string[] = [];
  lines.forEach((existing, i) => {
    if (i === blocks[0]!.start) out.push(line);
    else if (i > blocks[0]!.start && i < blocks[0]!.end) return;
    else if (!drop.has(i)) out.push(existing);
  });
  return tidy(out);
}

/** Removes a note: its words and every number that points to it. */
export function removeFootnote(body: string, label: string): string {
  const lines = linesOf(body);
  const blocks = definitionBlocks(lines);
  const gone = new Set<number>();
  blocks
    .filter((block) => block.label === label)
    .forEach((block) => {
      for (let i = block.start; i < block.end; i++) gone.add(i);
      // The blank lines that followed it go too, when a blank line (or nothing) came before it: no gap is left behind.
      if (block.start === 0 || lines[block.start - 1]!.trim() === "") {
        for (let i = block.end; i < lines.length && lines[i]!.trim() === ""; i++) gone.add(i);
      }
    });
  const prose = new Set(proseLines(lines, blocks));
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (gone.has(i)) return;
    if (!prose.has(i)) {
      out.push(line);
      return;
    }
    let changed = false;
    const next = line.replace(REFERENCE, (whole, found: string) => {
      if (found !== label) return whole;
      changed = true;
      return "";
    });
    out.push(changed ? next.replace(/[ \t]+$/, "") : line);
  });
  return tidy(out);
}

/** Where the first number of a note is in the text (for a cursor), or null. */
export function footnoteReferenceRange(body: string, label: string): { start: number; end: number } | null {
  const lines = linesOf(body);
  const blocks = definitionBlocks(lines);
  const prose = new Set(proseLines(lines, blocks));
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (prose.has(i)) {
      for (const match of line.matchAll(REFERENCE)) {
        if (match[1] === label) return { start: offset + match.index!, end: offset + match.index! + match[0].length };
      }
    }
    offset += line.length + 1;
  }
  return null;
}

export interface FootnoteDefinition {
  label: string;
  /** The note exactly as it is written in the manuscript (all its lines). */
  raw: string;
  /** Its words as one paragraph. */
  text: string;
}

/**
 * The manuscript without its notes, and the notes as written, for an editor that shows the numbers in the text and keeps the notes apart
 * (the visual editor). Putting `prose` and the notes back together (notes after the text, one blank line between them) gives a manuscript
 * the reader reads the same way. A manuscript with no notes is returned untouched.
 */
export function splitFootnotes(body: string): { prose: string; definitions: FootnoteDefinition[] } {
  const lines = linesOf(body);
  const blocks = definitionBlocks(lines);
  if (blocks.length === 0) return { prose: body, definitions: [] };
  const gone = new Set<number>();
  blocks.forEach((block) => {
    for (let i = block.start; i < block.end; i++) gone.add(i);
    // As in removeFootnote: the blank lines after a note go with it when a blank line (or nothing) came before it.
    if (block.start === 0 || lines[block.start - 1]!.trim() === "") {
      for (let i = block.end; i < lines.length && lines[i]!.trim() === ""; i++) gone.add(i);
    }
  });
  return {
    prose: lines.filter((_, i) => !gone.has(i)).join("\n").replace(/\s+$/, ""),
    definitions: blocks.map((block) => ({ label: block.label, raw: lines.slice(block.start, block.end).join("\n"), text: block.text }))
  };
}

/** The lines as text, with no blank lines left at the end. Nothing else in the manuscript is reflowed. */
function tidy(lines: string[]): string {
  return lines.join("\n").replace(/\s+$/, "");
}
