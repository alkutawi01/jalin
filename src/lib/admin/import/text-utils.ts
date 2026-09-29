/**
 * Text helpers for manuscript import. Pure functions, no I/O.
 */

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function estimateReadingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/** Lowercase latin slug, diacritics stripped. Returns "" when nothing usable remains. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SECTION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ZERO_WIDTH = /[​‌‍⁠﻿]/;

function foldChar(ch: string): string {
  if (ZERO_WIDTH.test(ch)) return "";
  switch (ch) {
    case "‘":
    case "’":
    case "‚":
    case "‛":
    case "ʼ":
      return "'";
    case "“":
    case "”":
    case "„":
    case "‟":
      return '"';
    case "–":
    case "—":
    case "−":
      return "-";
    case "…":
      return "...";
    case " ":
      return " ";
    default:
      return ch.toLowerCase();
  }
}

export interface FoldedText {
  /** Folded text: lowercase, curly quotes/dashes straightened, whitespace runs collapsed to one space. */
  text: string;
  /** For every char in `text`, the index of the source char it came from. */
  map: number[];
}

/** Fold text for tolerant matching while remembering offsets into the original. */
export function foldWithMap(source: string): FoldedText {
  const chars: string[] = [];
  const map: number[] = [];
  let lastWasSpace = true; // drop leading whitespace
  for (let i = 0; i < source.length; i++) {
    const folded = foldChar(source[i]!);
    if (folded === "") continue;
    for (const out of folded) {
      if (/\s/.test(out)) {
        if (lastWasSpace) continue;
        chars.push(" ");
        map.push(i);
        lastWasSpace = true;
      } else {
        chars.push(out);
        map.push(i);
        lastWasSpace = false;
      }
    }
  }
  while (chars.length > 0 && chars[chars.length - 1] === " ") {
    chars.pop();
    map.pop();
  }
  return { text: chars.join(""), map };
}

export function foldText(source: string): string {
  return foldWithMap(source).text;
}

export interface TextSpan {
  start: number;
  end: number;
}

/**
 * Find `needle` in `haystack` ignoring case, whitespace differences and
 * curly/straight quote differences. Returns the span in the ORIGINAL
 * haystack (so callers can slice the author's exact text), or null.
 */
export function locateInText(
  haystack: FoldedText,
  originalLength: number,
  needle: string,
  fromOriginalIndex = 0
): TextSpan | null {
  const foldedNeedle = foldText(needle);
  if (!foldedNeedle) return null;

  let startFolded = 0;
  if (fromOriginalIndex > 0) {
    startFolded = haystack.map.findIndex((origIndex) => origIndex >= fromOriginalIndex);
    if (startFolded === -1) return null;
  }

  const at = haystack.text.indexOf(foldedNeedle, startFolded);
  if (at === -1) return null;

  const lastFolded = at + foldedNeedle.length - 1;
  const start = haystack.map[at]!;
  const end = Math.min(originalLength, haystack.map[lastFolded]! + 1);
  return { start, end };
}
