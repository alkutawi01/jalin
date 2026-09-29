/**
 * Reads the chatbot's labelled-text answer (format v4, see output-format.ts)
 * into the same JSON-shaped object the JSON path produces, so validation and
 * the import plan are shared.
 *
 * Deliberately forgiving, like Adjung's "Tampal": labels are matched
 * case-insensitively and without diacritics, Markdown decoration (**bold**,
 * bullets, code fences, # headings) is ignored, values may continue on the
 * next line, and a missing closing tag does no harm.
 */

import { SECTION_NAMES } from "./output-format";
import type { OutputSection } from "./recipes";

export interface LabelledParse {
  raw: Record<string, unknown>;
  sectionsFound: OutputSection[];
}

const HEADING_ALIASES: Record<string, OutputSection> = {
  KARYA: "KARYA",
  "MAKLUMAT KARYA": "KARYA",
  SIRI: "SIRI",
  KANDUNGAN: "KANDUNGAN",
  BAB: "BAB",
  SUMBER: "SUMBER",
  WATAK: "WATAK",
  GLOSARI: "GLOSARI",
  GAMBAR: "GAMBAR",
  VISUAL: "GAMBAR"
};

function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[​‌‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Recognises "[KARYA]", "KARYA:", "## Karya", "**[WATAK]**" as section headings. */
function headingOf(line: string): OutputSection | null {
  const stripped = line
    .trim()
    .replace(/^[#>*_\s\[\(<-]+/, "")
    .replace(/[\]\)>*_:\s-]+$/, "");
  if (!stripped || stripped.length > 30) return null;
  const key = fold(stripped).toUpperCase();
  return HEADING_ALIASES[key] ?? null;
}

function isClosingTag(line: string): boolean {
  return /^\s*[\[<]\s*\/\s*[A-Za-z ]+\s*[\]>]\s*$/.test(line);
}

const SEPARATOR = /^\s*(?:_{3,}|-{3,}|={3,}|\*{3,})\s*$/;

type FieldMap = Record<string, string>;

const FIELD_ALIASES: Record<OutputSection, FieldMap> = {
  KARYA: {
    jenis: "type",
    type: "type",
    tajuk: "title",
    title: "title",
    slug: "slug",
    dek: "dek",
    genre: "genre",
    penulis: "author",
    pengarang: "author",
    author: "author",
    "anggaran bacaan": "reading",
    bacaan: "reading",
    "masa bacaan": "reading",
    minit: "reading",
    audiens: "audience",
    khalayak: "audience"
  },
  SIRI: {
    "tajuk siri": "title",
    tajuk: "title",
    mod: "mode",
    "dek siri": "dek",
    dek: "dek"
  },
  KANDUNGAN: {},
  BAB: {
    nombor: "order",
    no: "order",
    slug: "slug",
    tajuk: "title",
    "tajuk dalam manuskrip": "heading",
    "tajuk asal": "heading",
    "tajuk dalam teks": "heading",
    ringkasan: "summary"
  },
  SUMBER: {
    "tajuk asal": "title",
    tajuk: "title",
    "pengarang asal": "author",
    pengarang: "author",
    penulis: "author",
    "bahasa asal": "language",
    bahasa: "language",
    "asal-usul": "provenance",
    "asal usul": "provenance",
    provenance: "provenance"
  },
  WATAK: {
    nama: "name",
    peranan: "role",
    penerangan: "description",
    "muncul di": "first",
    "kemunculan pertama": "first",
    bab: "first"
  },
  GLOSARI: {
    istilah: "term",
    perkataan: "term",
    maksud: "meaning",
    makna: "meaning",
    "muncul di": "first",
    bab: "first"
  },
  GAMBAR: {
    jenis: "role",
    peranan: "role",
    bab: "section",
    petikan: "anchor",
    anchor: "anchor",
    letak: "place",
    nisbah: "ratio",
    adegan: "scene",
    scene: "scene",
    "bukan dalam adegan": "notInScene",
    "tidak dalam adegan": "notInScene",
    muka: "face",
    alt: "alt",
    "alt text": "alt",
    sebab: "reason"
  }
};

const LABEL_LINE = /^\s*(?:[-*•]|\d+[.)])?\s*\**\s*([^:：\n]{1,45}?)\s*\**\s*[:：]\s*(.*)$/;

function cleanValue(value: string): string {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function parseBlock(section: OutputSection, lines: string[]): Record<string, string> {
  const aliases = FIELD_ALIASES[section];
  const fields: Record<string, string> = {};
  let current: string | null = null;

  for (const line of lines) {
    const match = line.match(LABEL_LINE);
    if (match) {
      const key = aliases[fold(match[1]!.replace(/\(.*?\)/g, ""))];
      if (key) {
        current = key;
        if (!(key in fields)) fields[key] = cleanValue(match[2] ?? "");
        else current = null; // repeated label in one block: first wins, ignore the repeat
        continue;
      }
    }
    if (current && line.trim() && !isClosingTag(line)) {
      fields[current] = cleanValue(`${fields[current]} ${line}`);
    }
  }
  return fields;
}

function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [[]];
  for (const line of lines) {
    if (SEPARATOR.test(line)) blocks.push([]);
    else blocks[blocks.length - 1]!.push(line);
  }
  return blocks.filter((block) => block.some((line) => line.trim().length > 0));
}

function numberFrom(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function placeOf(value: string | undefined): "after" | "before" {
  return value && /sebelum|before/i.test(value) ? "before" : "after";
}

function seriesMode(value: string | undefined): string {
  return value && /antolog|anthology/i.test(fold(value)) ? "anthology" : "continuous";
}

export function looksLabelled(answer: string): boolean {
  const lines = answer.replace(/\r\n/g, "\n").split("\n");
  return lines.some((line) => headingOf(line) === "KARYA");
}

export function parseLabelledAnswer(answer: string): LabelledParse | null {
  const source = answer
    .replace(/\r\n/g, "\n")
    .replace(/^\s*```[a-zA-Z]*\s*$/gm, "");
  const lines = source.split("\n");

  const sections: { name: OutputSection; lines: string[] }[] = [];
  for (const line of lines) {
    const heading = headingOf(line);
    if (heading) {
      sections.push({ name: heading, lines: [] });
      continue;
    }
    if (isClosingTag(line)) continue;
    if (sections.length > 0) sections[sections.length - 1]!.lines.push(line);
  }
  if (!sections.some((s) => s.name === "KARYA")) return null;

  const raw: Record<string, unknown> = {};
  const found: OutputSection[] = [];
  const blocksOf = (name: OutputSection): string[][] =>
    sections.filter((s) => s.name === name).flatMap((s) => splitBlocks(s.lines));

  for (const name of SECTION_NAMES) {
    if (!sections.some((s) => s.name === name)) continue;
    found.push(name);

    if (name === "KANDUNGAN") {
      const text = sections
        .filter((s) => s.name === "KANDUNGAN")
        .map((s) => s.lines.join("\n"))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      raw.content = text;
      continue;
    }

    const blocks = blocksOf(name);

    if (name === "KARYA") {
      const merged: Record<string, string> = {};
      for (const block of blocks) {
        for (const [k, v] of Object.entries(parseBlock("KARYA", block))) if (!(k in merged)) merged[k] = v;
      }
      raw.type = merged.type ?? "";
      raw.title = merged.title ?? "";
      raw.slug = merged.slug ?? "";
      raw.dek = merged.dek ?? "";
      raw.genre = merged.genre ?? "";
      raw.audience = merged.audience ?? "13-17";
      raw.author = { name: merged.author ?? "" };
      raw.readingMinutes = numberFrom(merged.reading) ?? 0;
    } else if (name === "SIRI") {
      const fields = blocks.length ? parseBlock("SIRI", blocks.flat()) : {};
      raw.series = { title: fields.title ?? "", mode: seriesMode(fields.mode), dek: fields.dek ?? "" };
    } else if (name === "SUMBER") {
      const fields = blocks.length ? parseBlock("SUMBER", blocks.flat()) : {};
      raw.source = {
        title: fields.title ?? "",
        author: fields.author ?? "",
        language: fields.language ?? "",
        provenance: fields.provenance ?? ""
      };
    } else if (name === "BAB") {
      raw.sections = blocks.map((block, index) => {
        const f = parseBlock("BAB", block);
        return {
          order: numberFrom(f.order) ?? index + 1,
          slug: f.slug ?? "",
          title: f.title ?? "",
          headingText: f.heading ?? "",
          summary: f.summary ?? ""
        };
      });
    } else if (name === "WATAK") {
      raw.characters = blocks.map((block) => {
        const f = parseBlock("WATAK", block);
        return { name: f.name ?? "", role: f.role ?? "", description: f.description ?? "", firstAppearanceSection: f.first ?? "" };
      });
    } else if (name === "GLOSARI") {
      raw.glossary = blocks.map((block) => {
        const f = parseBlock("GLOSARI", block);
        return { term: f.term ?? "", meaning: f.meaning ?? "", firstAppearanceSection: f.first ?? "" };
      });
    } else if (name === "GAMBAR") {
      raw.visualSuggestions = blocks.map((block) => {
        const f = parseBlock("GAMBAR", block);
        return {
          role: /hero|utama/i.test(f.role ?? "") ? "hero" : "inline",
          sectionSlug: f.section ?? "",
          anchor: f.anchor ?? "",
          place: placeOf(f.place),
          aspectRatio: (f.ratio ?? "").replace(/\s+/g, ""),
          scene: f.scene ?? "",
          notInScene: f.notInScene ?? "",
          faceTreatment: f.face ?? "",
          altText: f.alt ?? "",
          reason: f.reason ?? ""
        };
      });
    }
  }

  return { raw, sectionsFound: found };
}
