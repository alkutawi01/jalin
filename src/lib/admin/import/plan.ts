/**
 * Builds an ImportPlan from a chatbot answer + the manuscript. Pure: no
 * database access. The plan is what a dry-run shows and what the
 * transactional writer (import-service.ts) persists as a DRAFT.
 */

import { composeVisualPrompt } from "../visual-generation/prompt-composer";
import {
  prepareSingleBody,
  resolveAnchor,
  splitIntoSections,
  type SplitSection
} from "./manuscript";
import {
  readParserAnswer,
  type ImportableType,
  type ImportIssue,
  type ParsedSource
} from "./parser-output";
import { countWords, estimateReadingMinutes, foldText } from "./text-utils";

export interface PlannedCredit {
  guestName: string;
  roleLabel: string;
  byline: boolean;
  isPublic: boolean;
  sortOrder: number;
}

export interface PlannedVisual {
  role: "hero" | "inline";
  sectionSlug: string | null;
  anchor: string | null;
  place: "before" | "after";
  aspectRatio: string;
  altText: string;
  /** Stored as visual_requests.prompt (the editable scene instruction). */
  scenePrompt: string;
  /** House style + work context + scene: paste this into an image generator. */
  finalPrompt: string;
  reason: string | null;
  faceTreatment: string | null;
}

export interface ImportPlan {
  work: {
    title: string;
    slug: string;
    type: ImportableType;
    genre: string | null;
    audience: string;
    dek: string | null;
    readingMinutes: number;
    body: string;
    status: "draft";
  };
  credits: PlannedCredit[];
  characters: { name: string; role: string; firstAppearanceSection: string | null }[];
  glossary: { term: string; meaning: string; source: string; sortOrder: number }[];
  sections: { slug: string; title: string; position: number; body: string; words: number }[];
  source: ParsedSource | null;
  visuals: PlannedVisual[];
  stats: {
    manuscriptWords: number;
    storedWords: number;
    parserReadingMinutes: number | null;
    readingMinutes: number;
    sectionCount: number;
  };
  locations: string[];
  themes: string[];
}

export interface ImportResult {
  ok: boolean;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  plan: ImportPlan | null;
  /** The chatbot's Editor Report (text after the JSON), shown to the editor. */
  report: string;
}

export interface ImportOptions {
  slugOverride?: string;
}

export function buildImportPlan(answer: string, manuscript: string, options: ImportOptions = {}): ImportResult {
  const parsed = readParserAnswer(answer);
  const errors: ImportIssue[] = [...parsed.errors];
  const warnings: ImportIssue[] = [...parsed.warnings];

  if (!manuscript.trim()) {
    errors.push({ code: "manuscript_missing", message: "Manuskrip belum ditampal." });
  }
  if (!parsed.data || !manuscript.trim()) {
    return { ok: false, errors, warnings, plan: null, report: parsed.report };
  }

  const data = parsed.data;
  const slug = options.slugOverride?.trim() ? options.slugOverride.trim() : data.slug;

  let bodyForWork = "";
  let sections: SplitSection[] = [];
  let storedWords = 0;
  const manuscriptWords = countWords(manuscript);

  if (data.type === "novela") {
    const split = splitIntoSections(manuscript, data.sections);
    errors.push(...split.errors);
    warnings.push(...split.warnings);
    if (split.errors.length > 0) {
      return { ok: false, errors, warnings, plan: null, report: parsed.report };
    }
    sections = split.sections;
    storedWords = split.bodyWords;
    bodyForWork = "";

    const lost = manuscriptWords - split.bodyWords - split.preface.words;
    const headingWordsBudget = data.sections.length * 12;
    if (lost > headingWordsBudget) {
      warnings.push({
        code: "words_unaccounted",
        message: `${lost} perkataan manuskrip tidak masuk ke mana-mana bab (selain tajuk bab). Semak pembelahan bab.`
      });
    }
  } else {
    const single = prepareSingleBody(manuscript, data.title);
    bodyForWork = single.body;
    storedWords = single.words;
    if (single.words === 0) errors.push({ code: "body_empty", message: "Manuskrip kosong selepas dibersihkan." });
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, plan: null, report: parsed.report };
  }

  const readingMinutes = estimateReadingMinutes(storedWords);
  if (data.readingMinutes !== null && Math.abs(data.readingMinutes - readingMinutes) > Math.max(2, readingMinutes * 0.25)) {
    warnings.push({
      code: "reading_minutes_differs",
      message: `Chatbot menganggar ${data.readingMinutes} minit; dikira daripada teks sebenar: ${readingMinutes} minit (${storedWords} perkataan). Nilai yang dikira digunakan.`
    });
  }

  const bodies = data.type === "novela"
    ? sections.map((s) => ({ slug: s.slug, body: s.body }))
    : [{ slug: "", body: bodyForWork }];

  const sectionSlugs = new Set(sections.map((s) => s.slug));

  const credits: PlannedCredit[] = [];
  if (data.authorName) {
    credits.push({
      guestName: data.authorName,
      roleLabel: data.authorCredit ?? "author",
      byline: false,
      isPublic: true,
      sortOrder: 1
    });
  } else {
    warnings.push({
      code: "author_unknown",
      message: "Nama penulis tidak dinyatakan. Tambah kredit (penulis/penyunting) di tab Kredit; gate penerbitan menuntut sekurang-kurangnya satu kredit dan satu byline awam."
    });
  }

  if (data.type === "novela") {
    for (const c of data.characters) {
      if (c.firstAppearanceSection && !sectionSlugs.has(c.firstAppearanceSection)) {
        warnings.push({
          code: "character_section_unknown",
          message: `Watak "${c.name}" merujuk bahagian "${c.firstAppearanceSection}" yang tiada; rujukan dikosongkan.`
        });
      }
    }
  }
  const characters = data.characters.map((c) => ({
    name: c.name,
    role: c.role,
    firstAppearanceSection:
      c.firstAppearanceSection && (data.type !== "novela" || sectionSlugs.has(c.firstAppearanceSection))
        ? c.firstAppearanceSection
        : null
  }));

  const wholeText = bodies.map((b) => b.body).join("\n\n");
  const foldedWhole = foldText(wholeText);
  const glossary: ImportPlan["glossary"] = [];
  const seenTerms = new Set<string>();
  const knownNames = new Set(
    [...data.characters.map((c) => c.name), ...data.locations].map((name) => foldText(name))
  );
  for (const g of data.glossary) {
    const key = foldText(g.term);
    if (seenTerms.has(key)) continue;
    seenTerms.add(key);
    if (knownNames.has(key)) {
      warnings.push({
        code: "glossary_term_is_name",
        message: `"${g.term}" ialah nama watak/lokasi/sistem, bukan istilah glosari (ia akan digaris bawah pada setiap kemunculan). Dilangkau.`
      });
      continue;
    }
    if (!foldedWhole.includes(key)) {
      warnings.push({
        code: "glossary_term_not_in_text",
        message: `Istilah glosari "${g.term}" tidak ditemui dalam teks; tooltip tidak akan muncul. Dilangkau.`
      });
      continue;
    }
    glossary.push({ term: g.term, meaning: g.meaning, source: "", sortOrder: glossary.length + 1 });
  }

  const visuals: PlannedVisual[] = [];
  const heroCount = data.visuals.filter((v) => v.role === "hero").length;
  if (heroCount === 0 && (data.type === "cerpen" || data.type === "novela")) {
    warnings.push({ code: "hero_missing", message: "Tiada cadangan visual hero; hero diwajibkan untuk terbit (cerpen/novela)." });
  }
  if (heroCount > 1) {
    warnings.push({ code: "hero_multiple", message: `${heroCount} visual hero dicadangkan; hanya satu boleh menjadi hero.` });
  }

  data.visuals.forEach((v, index) => {
    let anchor: string | null = null;
    let sectionSlug: string | null = v.sectionSlug;
    if (v.role === "inline") {
      if (!v.anchor) {
        warnings.push({ code: "visual_no_anchor", message: `Visual inline #${index + 1} tiada anchor; tetapkan penempatan secara manual.` });
      } else {
        const resolved = resolveAnchor(v.anchor, bodies, v.sectionSlug);
        if (!resolved) {
          warnings.push({
            code: "visual_anchor_not_found",
            message: `Anchor visual #${index + 1} tidak ditemui dalam teks ("${v.anchor.slice(0, 60)}…"); tetapkan penempatan secara manual.`
          });
        } else {
          anchor = resolved.anchor;
          sectionSlug = resolved.sectionSlug || null;
          if (v.sectionSlug && resolved.sectionSlug && v.sectionSlug !== resolved.sectionSlug) {
            warnings.push({
              code: "visual_section_mismatch",
              message: `Visual #${index + 1} dilabel bab "${v.sectionSlug}" tetapi anchor ditemui dalam "${resolved.sectionSlug}".`
            });
          }
        }
      }
    }
    if (!v.altText) {
      warnings.push({ code: "visual_no_alt", message: `Visual #${index + 1} tiada alt text; wajib sebelum diluluskan.` });
    }

    const sceneParts = [v.scene.trim()];
    if (v.faceTreatment) sceneParts.push(`Face treatment: ${v.faceTreatment}.`);
    if (v.notInScene) sceneParts.push(`Not in scene: ${v.notInScene}`);
    const scenePrompt = sceneParts.join(" ");

    const composed = composeVisualPrompt({
      sceneInstruction: scenePrompt,
      role: v.role,
      aspectRatio: v.aspectRatio as Parameters<typeof composeVisualPrompt>[0]["aspectRatio"],
      workTitle: data.title,
      workType: data.type
    });

    visuals.push({
      role: v.role,
      sectionSlug,
      anchor,
      place: v.place,
      aspectRatio: v.aspectRatio,
      altText: v.altText ?? "",
      scenePrompt,
      finalPrompt: composed.finalPrompt,
      reason: v.reason,
      faceTreatment: v.faceTreatment
    });
  });

  if (data.type === "fragmen" || data.type === "sinopsis") {
    warnings.push({
      code: "rights_review_required",
      message: "Status hak karya asal ditetapkan oleh editor manusia (tab Sumber) sebelum boleh terbit."
    });
  }

  const plan: ImportPlan = {
    work: {
      title: data.title,
      slug,
      type: data.type,
      genre: data.genre,
      audience: data.audience ?? "13-17",
      dek: data.dek,
      readingMinutes,
      body: bodyForWork,
      status: "draft"
    },
    credits,
    characters,
    glossary,
    sections: sections.map((s) => ({ slug: s.slug, title: s.title, position: s.position, body: s.body, words: s.words })),
    source: data.source,
    visuals,
    stats: {
      manuscriptWords,
      storedWords,
      parserReadingMinutes: data.readingMinutes,
      readingMinutes,
      sectionCount: sections.length
    },
    locations: data.locations,
    themes: data.themes
  };

  return { ok: true, errors, warnings, plan, report: parsed.report };
}
