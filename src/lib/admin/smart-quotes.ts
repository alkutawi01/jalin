/**
 * House style for quotation marks (PPRM / Dewan Bahasa dan Pustaka): dialogue and quoted words use double
 * curly marks, “like this”, and single curly marks, ‘like this’, only for a quotation inside a quotation.
 *
 * Applied while the editor types or pastes. It is deliberately cautious: a straight mark is converted only when its
 * neighbours make the direction clear, and otherwise left exactly as typed. Every replacement is one character for
 * one character, so the caret never moves. An apostrophe inside a word (ma'af) and a single mark outside any double
 * quotation are never touched.
 */

const OPEN = "“";
const CLOSE = "”";
const SINGLE_OPEN = "‘";
const SINGLE_CLOSE = "’";

/** What may stand before an opening mark. */
const BEFORE_OPENING = /^$|[\s([{—–“‘]$/u;
/** What may stand after a closing mark. */
const AFTER_CLOSING = /^$|^[\s.,;:!?…)\]}—–”’-]/u;
/** What an opening mark must be followed by (something to quote). */
const STARTS_QUOTED = /^[^\s.,;:!?…)\]}”’]/u;

/** Parts of a line that are not prose: image markers, inline code, link targets. */
const NOT_PROSE = /\[\[[^\]]*\]\]|`[^`]*`|\]\([^)]*\)/g;

function convertLine(line: string): string {
  // Mask the non-prose parts with a placeholder of the same length so positions stay aligned.
  const masked = line.replace(NOT_PROSE, (m) => [...m].map(() => "\u0000").join(""));
  const chars = [...line];
  const view = [...masked];
  let double = false;
  let single = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = view[i]!;
    if (ch === "\u0000") continue;
    const before = i === 0 ? "" : chars[i - 1]!;
    const after = view[i + 1] === undefined || view[i + 1] === "\u0000" ? "" : view[i + 1]!;
    const beforeIsOpener = BEFORE_OPENING.test(before);
    if (ch === OPEN) { double = true; continue; }
    if (ch === CLOSE) { double = false; single = false; continue; }
    if (ch === SINGLE_OPEN) { single = true; continue; }
    if (ch === SINGLE_CLOSE) { single = false; continue; }
    if (ch === "\"") {
      // After a colon, semicolon or comma a quotation may follow without a space (kata:"Hai"): that opens it.
      if ((beforeIsOpener || /[:;,]/.test(before)) && STARTS_QUOTED.test(after)) { chars[i] = OPEN; double = true; }
      else if (!beforeIsOpener && AFTER_CLOSING.test(after)) { chars[i] = CLOSE; double = false; single = false; }
    } else if (ch === "'" && double) {
      if (beforeIsOpener && STARTS_QUOTED.test(after)) { chars[i] = SINGLE_OPEN; single = true; }
      else if (!beforeIsOpener && single && AFTER_CLOSING.test(after)) { chars[i] = SINGLE_CLOSE; single = false; }
    }
  }
  return chars.join("");
}

/** Converts straight quotation marks to the house style where the direction is clear. Same length in and out. */
export function smartQuotes(text: string): string {
  if (!text.includes("\"") && !text.includes("'")) return text;
  let inFence = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line; }
      return inFence ? line : convertLine(line);
    })
    .join("\n");
}
