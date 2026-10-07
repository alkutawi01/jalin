/**
 * Manuscript handling for import: split a pasted manuscript into novela
 * chapters using the parser's heading text, normalise paragraphs for the
 * reader, and resolve visual anchors. Pure functions, no I/O.
 *
 * The manuscript text is never rewritten: only paragraph separators are
 * normalised (each non-empty line becomes one markdown paragraph).
 */

import type { ImportIssue, ParsedSection } from "./parser-output";
import { countWords, foldText, foldWithMap, locateInText, type TextSpan } from "./text-utils";

export interface SplitSection {
  slug: string;
  title: string;
  position: number;
  body: string;
  words: number;
}

export interface SplitResult {
  sections: SplitSection[];
  /** Text found before the first heading (usually the title block). */
  preface: { text: string; words: number };
  errors: ImportIssue[];
  warnings: ImportIssue[];
  totalWords: number;
  bodyWords: number;
}

const MARKDOWN_LINE_START = /^(#{1,6}\s|[-*+]\s|>\s|\d+[.)]\s)/;
/** A section heading ("## Bahagian 1"): the one Markdown marker Jalin itself uses in a manuscript, so it is kept. */
const SECTION_HEADING = /^##\s+\S/;

/** Every non-empty line becomes one paragraph; leading markdown markers are escaped, except "## " section headings, which stay headings. */
export function toParagraphs(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/ /g, " ").trim())
    .filter((line) => line.length > 0)
    .map((line) => (MARKDOWN_LINE_START.test(line) && !SECTION_HEADING.test(line) ? `\\${line}` : line))
    .join("\n\n");
}

function isLineStart(original: string, index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    const ch = original[i]!;
    if (ch === "\n") return true;
    if (!/\s/.test(ch)) return false;
  }
  return true;
}

function isLineEnd(original: string, index: number): boolean {
  for (let i = index; i < original.length; i++) {
    const ch = original[i]!;
    if (ch === "\n") return true;
    if (!/\s/.test(ch)) return false;
  }
  return true;
}

/** Find a heading that occupies whole line(s); prose that merely contains the words never matches. */
function locateHeading(
  folded: ReturnType<typeof foldWithMap>,
  original: string,
  candidate: string,
  fromIndex: number
): TextSpan | null {
  let cursor = fromIndex;
  for (let guard = 0; guard < 200; guard++) {
    const span = locateInText(folded, original.length, candidate, cursor);
    if (!span) return null;
    if (isLineStart(original, span.start) && isLineEnd(original, span.end)) return span;
    cursor = span.start + 1;
  }
  return null;
}

export function splitIntoSections(manuscript: string, sections: ParsedSection[]): SplitResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const totalWords = countWords(manuscript);
  const folded = foldWithMap(manuscript);

  const spans: { section: ParsedSection; span: TextSpan }[] = [];
  let cursor = 0;
  for (const section of sections) {
    const candidates = [
      section.headingText,
      `bab ${section.order} ${section.title}`,
      `bahagian ${section.order} ${section.title}`,
      section.title
    ].filter((c): c is string => typeof c === "string" && foldText(c).length > 0);

    let found: TextSpan | null = null;
    for (const candidate of candidates) {
      found = locateHeading(folded, manuscript, candidate, cursor);
      if (found) break;
    }
    if (!found) {
      errors.push({
        code: "heading_not_found",
        message: `Tajuk bab "${section.headingText ?? section.title}" (${section.slug}) tidak ditemui dalam manuskrip mengikut turutan. Semak bahawa manuskrip yang ditampal sama dengan yang diberi kepada bot sembang.`,
        path: `sections.${section.slug}`
      });
      continue;
    }
    spans.push({ section, span: found });
    cursor = found.end;
  }

  if (errors.length > 0) {
    return {
      sections: [],
      preface: { text: "", words: 0 },
      errors,
      warnings,
      totalWords,
      bodyWords: 0
    };
  }

  const prefaceRaw = manuscript.slice(0, spans[0]!.span.start);
  const preface = { text: toParagraphs(prefaceRaw), words: countWords(prefaceRaw) };
  if (preface.words > 60) {
    warnings.push({
      code: "preface_dropped",
      message: `Terdapat ${preface.words} perkataan sebelum bab pertama; teks itu TIDAK dimasukkan ke dalam bahagian mana-mana bab. Semak jika ia sepatutnya dimasukkan.`
    });
  }

  const result: SplitSection[] = [];
  let bodyWords = 0;
  spans.forEach(({ section, span }, index) => {
    const end = index + 1 < spans.length ? spans[index + 1]!.span.start : manuscript.length;
    const body = toParagraphs(manuscript.slice(span.end, end));
    const words = countWords(body);
    if (words === 0) {
      errors.push({
        code: "section_empty",
        message: `Bab "${section.title}" (${section.slug}) tiada teks selepas tajuknya.`,
        path: `sections.${section.slug}`
      });
    }
    bodyWords += words;
    result.push({ slug: section.slug, title: section.title, position: index + 1, body, words });
  });

  return { sections: result, preface, errors, warnings, totalWords, bodyWords };
}

/** Single-body works (cerpen, fragmen, sinopsis): whole manuscript minus a leading title line. */
export function prepareSingleBody(manuscript: string, title: string): { body: string; words: number; droppedTitleLine: boolean } {
  const lines = manuscript.split(/\r?\n/);
  let firstIndex = lines.findIndex((line) => line.trim().length > 0);
  let droppedTitleLine = false;
  if (firstIndex !== -1 && foldText(lines[firstIndex]!) === foldText(title)) {
    lines.splice(firstIndex, 1);
    droppedTitleLine = true;
  }
  const body = toParagraphs(lines.join("\n"));
  return { body, words: countWords(body), droppedTitleLine };
}

export interface ResolvedAnchor {
  /** Exact text from the stored body: the whole paragraph containing the parser's anchor. */
  anchor: string;
  /** Slug of the section whose body contains it ("" for single-body works). */
  sectionSlug: string;
}

/**
 * The reader splits a body at the anchor's exact end/start, so an anchor
 * from the middle of a paragraph would cut that paragraph around the
 * image. Widen the match to the whole paragraph and use the author's
 * exact text (not the chatbot's copy).
 */
export function resolveAnchor(
  anchorText: string,
  bodies: { slug: string; body: string }[],
  preferredSlug: string | null
): ResolvedAnchor | null {
  const ordered = [...bodies].sort((a, b) => (a.slug === preferredSlug ? -1 : b.slug === preferredSlug ? 1 : 0));
  for (const { slug, body } of ordered) {
    const folded = foldWithMap(body);
    const span = locateInText(folded, body.length, anchorText);
    if (!span) continue;
    const before = body.lastIndexOf("\n\n", span.start);
    const paragraphStart = before === -1 ? 0 : before + 2;
    const after = body.indexOf("\n\n", span.end);
    const paragraphEnd = after === -1 ? body.length : after;
    const anchor = body.slice(paragraphStart, paragraphEnd);
    if (anchor.trim().length === 0) continue;
    if (body.indexOf(anchor) !== paragraphStart) {
      // Paragraph text also occurs earlier; the reader would cut at the wrong place.
      continue;
    }
    return { anchor, sectionSlug: slug };
  }
  return null;
}
