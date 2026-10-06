/**
 * Reads the answer of the Jalin Master Content Parser (chatbot) and turns
 * it into a validated, normalised structure. Pure functions, no I/O.
 */

import { looksLabelled, parseLabelledAnswer } from "../authoring/labelled-output";
import { SECTION_SLUG_PATTERN, slugify } from "./text-utils";

export const IMPORTABLE_TYPES = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"] as const;
export type ImportableType = (typeof IMPORTABLE_TYPES)[number];

export const ASPECT_RATIOS = ["1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4"] as const;

export interface ImportIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ParsedCharacter {
  name: string;
  role: string;
  description: string | null;
  firstAppearanceSection: string | null;
}

export interface ParsedGlossaryTerm {
  term: string;
  meaning: string;
  firstAppearanceSection: string | null;
  /** Optional, for loanwords: how to say it, its own-script spelling and that language. */
  pronunciation?: string;
  original?: string;
  originalLanguage?: string;
}

export interface ParsedSection {
  order: number;
  slug: string;
  title: string;
  headingText: string | null;
  summary: string | null;
}

export interface ParsedVisual {
  role: "hero" | "inline";
  sectionSlug: string | null;
  anchor: string | null;
  place: "before" | "after";
  aspectRatio: string;
  scene: string;
  notInScene: string | null;
  faceTreatment: string | null;
  altText: string | null;
  reason: string | null;
}

export interface ParsedSource {
  title: string | null;
  author: string | null;
  language: string | null;
  provenance: string | null;
}

export interface ParsedSeries {
  title: string;
  slug: string;
  mode: "continuous" | "anthology";
  dek: string | null;
}

export interface ParserOutput {
  parserVersion: string | null;
  type: ImportableType;
  title: string;
  slug: string;
  dek: string | null;
  genre: string | null;
  audience: string | null;
  readingMinutes: number | null;
  authorName: string | null;
  authorCredit: string | null;
  characters: ParsedCharacter[];
  locations: string[];
  /** Latar tempat and latar masa (name and a few words each). */
  places: Array<{ name: string; description: string | null }>;
  times: Array<{ name: string; description: string | null }>;
  themes: string[];
  glossary: ParsedGlossaryTerm[];
  sections: ParsedSection[];
  source: ParsedSource | null;
  visuals: ParsedVisual[];
  /** Text written by the chatbot (sinopsis/fragmen in "tulis" mode). */
  content: string | null;
  /** New-series details (bersiri, only when the editor is starting a series). */
  series: ParsedSeries | null;
}

export interface ExtractedAnswer {
  jsonText: string;
  report: string;
}

/** Empty strings and the parser's "tidak dinyatakan" both mean "unknown". */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "tidak dinyatakan") return null;
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripTrailingCommas(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i]!;
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ",") {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j]!)) j++;
      if (json[j] === "}" || json[j] === "]") continue;
    }
    out += ch;
  }
  return out;
}

/** Index of the "}" that closes the "{" at `start`, string-aware. -1 if unbalanced. */
function findMatchingBrace(source: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Pulls the JSON object out of a whole chatbot answer. Handles a fenced
 * ```json block and a bare object (with or without a leading "JSON"
 * label, as copied from a chat window). Everything after the JSON is
 * returned as the editor report.
 */
export function extractParserJson(answer: string): ExtractedAnswer | null {
  const source = answer.replace(/\r\n/g, "\n");

  const fence = source.match(/```(?:json|JSON)?\s*\n(\s*\{[\s\S]*?)\n```/);
  if (fence && fence.index !== undefined) {
    const inner = fence[1]!;
    const start = inner.indexOf("{");
    const end = findMatchingBrace(inner, start);
    if (start !== -1 && end !== -1) {
      const report = source.slice(fence.index + fence[0].length).trim();
      return { jsonText: inner.slice(start, end + 1), report };
    }
  }

  const start = source.indexOf("{");
  if (start === -1) return null;
  const end = findMatchingBrace(source, start);
  if (end === -1) return null;
  return {
    jsonText: source.slice(start, end + 1),
    report: source.slice(end + 1).replace(/^\s*```\s*/, "").trim()
  };
}

function parseIssue(code: string, message: string, path?: string): ImportIssue {
  return path ? { code, message, path } : { code, message };
}

export interface ValidatedParserOutput {
  data: ParserOutput | null;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  report: string;
}

/** Extract, parse and validate a chatbot answer. */
/** The editor's own title/slug fill a gap when the chatbot could not find them in the text. */
function withHints(raw: Record<string, unknown>, hints: { title?: string; slug?: string }): Record<string, unknown> {
  const out = { ...raw };
  const title = hints.title?.trim();
  if (title && !text(out.title)) out.title = title;
  const slug = hints.slug?.trim();
  if (slug && !text(out.slug)) out.slug = slug;
  else if (title && !text(out.slug)) out.slug = slugify(title);
  return out;
}

export function readParserAnswer(answer: string, hints: { title?: string; slug?: string } = {}): ValidatedParserOutput {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];

  if (looksLabelled(answer)) {
    const labelled = parseLabelledAnswer(answer);
    if (labelled) {
      const data = normaliseParserOutput(withHints(labelled.raw, hints), errors, warnings);
      return { data: errors.length > 0 ? null : data, errors, warnings, report: "" };
    }
  }

  const extracted = extractParserJson(answer);
  if (!extracted) {
    errors.push(
      parseIssue(
        "json_not_found",
        "Jawapan chatbot tidak dikenali. Salin KESELURUHAN jawapan chatbot (bermula dengan [KARYA]) dan tekan Tampal semula."
      )
    );
    return { data: null, errors, warnings, report: "" };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(extracted.jsonText);
  } catch {
    try {
      raw = JSON.parse(stripTrailingCommas(extracted.jsonText));
      warnings.push(parseIssue("json_trailing_commas", "JSON mengandungi koma hujung; dibetulkan secara automatik."));
    } catch (error) {
      errors.push(
        parseIssue(
          "json_invalid",
          `JSON tidak sah: ${error instanceof Error ? error.message : "tidak dapat dibaca"}. Minta chatbot menjana semula blok JSON.`
        )
      );
      return { data: null, errors, warnings, report: extracted.report };
    }
  }

  if (!isRecord(raw)) {
    errors.push(parseIssue("json_not_object", "JSON mesti berupa satu objek."));
    return { data: null, errors, warnings, report: extracted.report };
  }

  const data = normaliseParserOutput(withHints(raw, hints), errors, warnings);
  return { data: errors.length > 0 ? null : data, errors, warnings, report: extracted.report };
}

function normaliseParserOutput(
  raw: Record<string, unknown>,
  errors: ImportIssue[],
  warnings: ImportIssue[]
): ParserOutput | null {
  const parserVersion = text(raw.parserVersion);
  if (parserVersion && parserVersion !== "v3") {
    warnings.push(
      parseIssue(
        "parser_version",
        `Output parser versi "${parserVersion}"; import direka untuk v3. Medan visual mungkin tidak lengkap.`
      )
    );
  }

  const rawType = text(raw.type)?.toLowerCase() ?? null;
  let type: ImportableType | null = null;
  if (!rawType) {
    errors.push(parseIssue("type_missing", "Jenis karya (type) tiada dalam output parser.", "type"));
  } else if ((IMPORTABLE_TYPES as readonly string[]).includes(rawType)) {
    type = rawType as ImportableType;
  } else {
    errors.push(parseIssue("type_unsupported", `Jenis "${rawType}" tidak disokong oleh import.`, "type"));
  }

  const title = text(raw.title);
  if (!title) errors.push(parseIssue("title_missing", "Tajuk karya tiada dalam output parser.", "title"));

  let slug = text(raw.slug);
  if (slug && !SECTION_SLUG_PATTERN.test(slug)) {
    const fixed = slugify(slug);
    warnings.push(parseIssue("slug_normalised", `Slug "${slug}" dibersihkan menjadi "${fixed}".`, "slug"));
    slug = fixed || null;
  }
  if (!slug && title) {
    slug = slugify(title);
    warnings.push(parseIssue("slug_derived", `Slug tiada; dicadangkan "${slug}" daripada tajuk.`, "slug"));
  }
  if (!slug) errors.push(parseIssue("slug_missing", "Slug tidak dapat ditentukan.", "slug"));

  const dek = text(raw.dek);
  if (!dek) warnings.push(parseIssue("dek_missing", "Dek (ringkasan) tiada.", "dek"));
  const genre = text(raw.genre);
  if (!genre) warnings.push(parseIssue("genre_missing", "Genre tidak dinyatakan.", "genre"));

  const author = isRecord(raw.author) ? raw.author : {};
  const authorName = text(author.name);
  const authorCredit = text(author.credit);

  const characters: ParsedCharacter[] = [];
  if (Array.isArray(raw.characters)) {
    raw.characters.forEach((item, index) => {
      if (!isRecord(item)) return;
      const name = text(item.name);
      const role = text(item.role);
      if (!name) {
        warnings.push(parseIssue("character_nameless", `Watak #${index + 1} tiada nama; dilangkau.`, `characters[${index}]`));
        return;
      }
      characters.push({
        name,
        role: role ?? "watak",
        description: text(item.description),
        firstAppearanceSection: text(item.firstAppearanceSection)
      });
    });
  }

  const locations: string[] = [];
  if (Array.isArray(raw.locations)) {
    for (const item of raw.locations) {
      const name = typeof item === "string" ? text(item) : isRecord(item) ? text(item.name) : null;
      if (name) locations.push(name);
    }
  }

  const settingList = (value: unknown): Array<{ name: string; description: string | null }> => {
    const out: Array<{ name: string; description: string | null }> = [];
    if (!Array.isArray(value)) return out;
    for (const item of value) {
      const entryName = isRecord(item) ? text(item.name) : typeof item === "string" ? text(item) : null;
      if (!entryName) continue;
      out.push({ name: entryName, description: isRecord(item) ? text(item.description) : null });
    }
    return out;
  };
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const places = settingList(settings.places);
  // The JSON parser lists locations as plain names: they are places too.
  for (const place of locations) if (!places.some((p) => p.name.toLowerCase() === place.toLowerCase())) places.push({ name: place, description: null });
  const times = settingList(settings.times);

  const themes: string[] = [];
  if (Array.isArray(raw.themes)) {
    for (const item of raw.themes) {
      const value = typeof item === "string" ? text(item) : null;
      if (value) themes.push(value);
    }
  }

  const glossary: ParsedGlossaryTerm[] = [];
  if (Array.isArray(raw.glossary)) {
    raw.glossary.forEach((item, index) => {
      if (!isRecord(item)) return;
      const term = text(item.term);
      const meaning = text(item.meaning);
      if (!term || !meaning) {
        warnings.push(parseIssue("glossary_incomplete", `Glosari #${index + 1} tiada term atau meaning; dilangkau.`, `glossary[${index}]`));
        return;
      }
      const pronunciation = text(item.pronunciation);
      const original = text(item.original);
      const originalLanguage = text(item.originalLanguage);
      glossary.push({
        term,
        meaning,
        firstAppearanceSection: text(item.firstAppearanceSection),
        ...(pronunciation ? { pronunciation } : {}),
        ...(original ? { original } : {}),
        ...(original && originalLanguage ? { originalLanguage } : {})
      });
    });
  }

  const sections: ParsedSection[] = [];
  const seenSlugs = new Set<string>();
  if (Array.isArray(raw.sections)) {
    raw.sections.forEach((item, index) => {
      if (!isRecord(item)) return;
      const sectionTitle = text(item.title);
      const orderRaw = typeof item.order === "number" ? item.order : Number(item.order);
      const order = Number.isInteger(orderRaw) && orderRaw >= 1 ? orderRaw : index + 1;
      let sectionSlug = text(item.slug) ?? (sectionTitle ? slugify(sectionTitle) : `bab-${order}`);
      if (!SECTION_SLUG_PATTERN.test(sectionSlug)) sectionSlug = slugify(sectionSlug) || `bab-${order}`;
      if (seenSlugs.has(sectionSlug)) {
        errors.push(parseIssue("section_slug_duplicate", `Slug bab "${sectionSlug}" berulang.`, `sections[${index}].slug`));
        return;
      }
      seenSlugs.add(sectionSlug);
      sections.push({
        order,
        slug: sectionSlug,
        title: sectionTitle ?? `Bab ${order}`,
        headingText: text(item.headingText),
        summary: text(item.summary)
      });
    });
    sections.sort((a, b) => a.order - b.order);
  }
  if (type === "novela" && sections.length === 0) {
    errors.push(parseIssue("sections_missing", "Novela mesti mempunyai senarai bab (sections) daripada parser.", "sections"));
  }

  let source: ParsedSource | null = null;
  if (isRecord(raw.source)) {
    const candidate: ParsedSource = {
      title: text(raw.source.title),
      author: text(raw.source.author),
      language: text(raw.source.language),
      provenance: text(raw.source.provenance)
    };
    if (candidate.title || candidate.author || candidate.language || candidate.provenance) source = candidate;
  }
  if ((type === "fragmen" || type === "sinopsis") && !source?.title) {
    warnings.push(parseIssue("source_missing", "Sumber karya asal tiada; isi di tab Sumber sebelum semakan hak.", "source"));
  }

  const visuals: ParsedVisual[] = [];
  if (Array.isArray(raw.visualSuggestions)) {
    raw.visualSuggestions.forEach((item, index) => {
      if (!isRecord(item)) return;
      const path = `visualSuggestions[${index}]`;
      const scene = text(item.scene);
      if (!scene) {
        warnings.push(parseIssue("visual_no_scene", `Visual #${index + 1} tiada scene; dilangkau.`, path));
        return;
      }
      const role = text(item.role)?.toLowerCase() === "hero" ? "hero" : "inline";
      const ratio = text(item.aspectRatio);
      const aspectRatio = ratio && (ASPECT_RATIOS as readonly string[]).includes(ratio) ? ratio : role === "hero" ? "3:2" : "4:3";
      if (ratio && aspectRatio !== ratio) {
        warnings.push(parseIssue("visual_ratio", `Nisbah "${ratio}" tidak disokong; guna ${aspectRatio}.`, `${path}.aspectRatio`));
      }
      visuals.push({
        role,
        sectionSlug: text(item.sectionSlug),
        anchor: text(item.anchor),
        place: text(item.place)?.toLowerCase() === "before" ? "before" : "after",
        aspectRatio,
        scene,
        notInScene: text(item.notInScene),
        faceTreatment: text(item.faceTreatment),
        altText: text(item.altText),
        reason: text(item.reason)
      });
    });
  }

  let series: ParsedSeries | null = null;
  if (isRecord(raw.series)) {
    const seriesTitle = text(raw.series.title);
    if (seriesTitle) {
      series = {
        title: seriesTitle,
        slug: slugify(seriesTitle),
        mode: text(raw.series.mode)?.toLowerCase() === "anthology" ? "anthology" : "continuous",
        dek: text(raw.series.dek)
      };
    }
  }
  const content = text(raw.content);

  const readingRaw = typeof raw.readingMinutes === "number" ? raw.readingMinutes : Number(raw.readingMinutes);
  const readingMinutes = Number.isFinite(readingRaw) && readingRaw > 0 ? Math.round(readingRaw) : null;

  if (!type || !title || !slug) return null;

  return {
    parserVersion,
    type,
    title,
    slug,
    dek,
    genre,
    audience: text(raw.audience),
    readingMinutes,
    authorName,
    authorCredit,
    characters,
    locations,
    places,
    times,
    themes,
    glossary,
    sections,
    source,
    visuals,
    content,
    series
  };
}
