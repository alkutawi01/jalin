/**
 * Builds an ImportPlan from a chatbot answer (+ the manuscript for "data"
 * mode). Pure: no database access. The plan is what a preview shows and what
 * the transactional writer (import-service.ts) persists as a DRAFT.
 */

import { composeVisualPrompt } from "../visual-generation/prompt-composer";
import { tidyShort } from "../../capitalise-first";
import {
  prepareSingleBody,
  resolveAnchor,
  splitIntoSections,
  toParagraphs,
  type SplitSection
} from "./manuscript";
import {
  readParserAnswer,
  type ImportableType,
  type ImportIssue,
  type ParsedSource
} from "./parser-output";
import { countWords, estimateReadingMinutes, foldText, slugify } from "./text-utils";
import { normalizeAudience } from "../../audience";

export interface PlannedCredit {
  guestName: string;
  roleLabel: string;
  byline: boolean;
  isPublic: boolean;
  sortOrder: number;
}

export interface PlannedVisual {
  /** Position in the chatbot's list; stays stable when the editor removes images. */
  originalIndex: number;
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

export type PlannedSeries =
  | { kind: "baharu"; title: string; slug: string; mode: "continuous" | "anthology"; dek: string | null }
  | { kind: "sambung"; seriesId: string };

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
  glossary: { term: string; meaning: string; source: string; sortOrder: number; pronunciation?: string; original?: string; originalLanguage?: string }[];
  /** Latar tempat and latar masa, ready to store in works.metadata. */
  places: { name: string; description?: string }[];
  times: { name: string; description?: string }[];
  sections: { slug: string; title: string; position: number; body: string; words: number }[];
  source: ParsedSource | null;
  series: PlannedSeries | null;
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

/** What the editor changed on the review screen after pasting the chatbot's answer. */
export interface ReviewEdits {
  readingMinutes?: number;
  source?: { title?: string | null; author?: string | null; language?: string | null; provenance?: string | null };
  /** Replaces the parsed glossary (terms not found in the text are dropped with a warning). */
  glossary?: { term: string; meaning: string; pronunciation?: string; original?: string; originalLanguage?: string }[];
  /** Replaces the parsed characters. */
  characters?: { name: string; role: string }[];
  /** Replaces the parsed latar tempat / latar masa. */
  places?: { name: string; description?: string }[];
  times?: { name: string; description?: string }[];
  /** By original index; null removes that image. */
  visuals?: ({ altText?: string; scene?: string; place?: "before" | "after"; aspectRatio?: string } | null)[];
}

export interface ImportResult {
  ok: boolean;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  plan: ImportPlan | null;
  /** Text the chatbot added after its data (old JSON format only). */
  report: string;
}

export interface ImportOptions {
  /** "data": the editor's manuscript is the text. "tulis": the chatbot wrote the text ([KANDUNGAN]). */
  mode?: "data" | "tulis";
  /** Values the editor typed over the chatbot's suggestions. */
  overrides?: { title?: string; slug?: string; dek?: string; genre?: string };
  /** Kept for the older import page. Same as overrides.slug. */
  slugOverride?: string;
  /** Real person to credit as the writer (public byline). */
  writerName?: string;
  /** Editor's changes on the review screen. */
  edits?: ReviewEdits;
  /** bersiri only. "baharu" uses the chatbot's [SIRI] (or the overrides); "sambung" joins an existing series. */
  series?:
    | { kind: "baharu"; title?: string; mode?: "continuous" | "anthology"; dek?: string }
    | { kind: "sambung"; seriesId: string };
  /**
   * What the series itself says (only when the episode continues one). The chatbot answered without knowing the series, so its
   * genre and audience give way to these; a genre the editor typed over the suggestion still wins.
   */
  /** What a continuing series gives the episode; `hasByline`: its inherited credits already include a name under the title. */
  seriesDefaults?: { genre?: string | null; audience?: string | null; hasByline?: boolean };
}

/** Chatbots often wrap a quoted passage in an extra pair of quotation marks. */
function stripWrappingQuotes(value: string): string {
  const t = value.trim();
  const pairs: [string, string][] = [["\"", "\""], ["“", "”"], ["'", "'"], ["‘", "’"], ["«", "»"]];
  for (const [open, close] of pairs) {
    if (t.length > 2 && t.startsWith(open) && t.endsWith(close)) return t.slice(open.length, t.length - close.length).trim();
  }
  return t;
}

function present(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildImportPlan(answer: string, manuscript: string, options: ImportOptions = {}): ImportResult {
  const mode = options.mode ?? "data";
  const parsed = readParserAnswer(answer, {
    title: options.overrides?.title,
    slug: options.overrides?.slug ?? options.slugOverride
  });
  const errors: ImportIssue[] = [...parsed.errors];
  const warnings: ImportIssue[] = [...parsed.warnings];

  if (mode === "data" && !manuscript.trim()) {
    errors.push({ code: "manuscript_missing", message: "Manuskrip belum ditampal." });
  }
  if (!parsed.data || errors.length > 0) {
    return { ok: false, errors, warnings, plan: null, report: parsed.report };
  }

  const data = { ...parsed.data };
  const overrides = options.overrides ?? {};
  data.title = present(overrides.title) ?? data.title;
  data.dek = present(overrides.dek) ?? data.dek;
  data.genre = present(overrides.genre) ?? present(options.seriesDefaults?.genre) ?? data.genre;
  const slug = present(overrides.slug) ?? present(options.slugOverride) ?? (present(overrides.title) ? slugify(data.title) : data.slug);

  let bodyForWork = "";
  let sections: SplitSection[] = [];
  let storedWords = 0;
  let manuscriptWords = countWords(manuscript);

  if (mode === "tulis") {
    if (!data.content) {
      errors.push({
        code: "content_missing",
        message: "Bot sembang tidak menyertakan bahagian [KANDUNGAN] (teks karya). Minta bot sembang menjana semula mengikut format."
      });
      return { ok: false, errors, warnings, plan: null, report: parsed.report };
    }
    bodyForWork = toParagraphs(data.content);
    storedWords = countWords(bodyForWork);
    manuscriptWords = storedWords;
  } else if (data.type === "novela") {
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
      message: `Bot sembang menganggar ${data.readingMinutes} minit; dikira daripada teks sebenar: ${readingMinutes} minit (${storedWords} perkataan). Nilai yang dikira digunakan.`
    });
  }

  const bodies = data.type === "novela" && mode === "data"
    ? sections.map((s) => ({ slug: s.slug, body: s.body }))
    : [{ slug: "", body: bodyForWork }];

  const sectionSlugs = new Set(sections.map((s) => s.slug));

  // Credits: the original author (sinopsis/fragmen) is labelled "Pengarang asal" and stays out of
  // the byline. The person who wrote the Jalin text is credited as "Penulis" with a public byline.
  const credits: PlannedCredit[] = [];
  const isDerivative = data.type === "sinopsis" || data.type === "fragmen";
  const sourceAuthor = present(data.source?.author);
  if (isDerivative && sourceAuthor) {
    credits.push({ guestName: sourceAuthor, roleLabel: "author", byline: false, isPublic: true, sortOrder: credits.length + 1 });
  }
  const writer = present(options.writerName) ?? (mode === "data" ? present(data.authorName) : undefined);
  if (writer && !(isDerivative && sourceAuthor && foldText(writer) === foldText(sourceAuthor))) {
    // The name under a sinopsis' or fragmen's title is the original author, shown automatically; their writer is only in the editorial block.
    credits.push({ guestName: writer, roleLabel: "initial_draft", byline: !isDerivative, isPublic: true, sortOrder: credits.length + 1 });
  }
  if (!isDerivative && !credits.some((c) => c.byline) && !options.seriesDefaults?.hasByline) {
    warnings.push({
      code: "byline_missing",
      message: "Belum ada penulis dikreditkan. Isi nama penulis sebenar (kredit awam) sebelum terbit; penerbitan memerlukan sekurang-kurangnya satu kredit yang ditanda ‘Nama di bawah tajuk’."
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
  const settingEntries = (list: Array<{ name: string; description: string | null }>, max: number) => {
    const seen = new Set<string>();
    const out: { name: string; description?: string }[] = [];
    for (const item of list) {
      const entryName = item.name.trim().slice(0, 80);
      const key = entryName.toLocaleLowerCase("ms");
      if (!entryName || seen.has(key) || out.length >= max) continue;
      seen.add(key);
      const note = tidyShort(item.description ?? "").slice(0, 160);
      out.push(note ? { name: entryName, description: note } : { name: entryName });
    }
    return out;
  };
  const places = settingEntries(data.places, 12);
  const times = settingEntries(data.times, 6);
  // The same character listed twice (a chatbot repeating itself, or a doubled paste) is one character: the first mention wins.
  const seenCharacters = new Set<string>();
  const characters = data.characters.filter((c) => {
    const key = foldText(c.name);
    if (!key || seenCharacters.has(key)) return false;
    seenCharacters.add(key);
    return true;
  }).map((c) => ({
    name: c.name,
    role: tidyShort(c.role) || c.role,
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
        message: `"${g.term}" ialah nama watak/lokasi/sistem, bukan istilah glosari. Dilangkau.`
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
    glossary.push({
      term: g.term,
      meaning: g.meaning,
      source: "",
      sortOrder: glossary.length + 1,
      ...(g.pronunciation ? { pronunciation: g.pronunciation } : {}),
      ...(g.original ? { original: g.original } : {}),
      ...(g.original && g.originalLanguage ? { originalLanguage: g.originalLanguage } : {})
    });
  }

  const visuals: PlannedVisual[] = [];
  const heroCount = data.visuals.filter((v) => v.role === "hero").length;
  if (heroCount === 0 && (data.type === "cerpen" || data.type === "novela" || data.type === "bersiri")) {
    warnings.push({ code: "hero_missing", message: "Tiada cadangan visual hero; hero diwajibkan untuk terbit." });
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
        const resolved = resolveAnchor(v.anchor, bodies, v.sectionSlug) ?? resolveAnchor(stripWrappingQuotes(v.anchor), bodies, v.sectionSlug);
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
      originalIndex: index,
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

  if (isDerivative) {
    warnings.push({
      code: "rights_review_required",
      message: "Status hak karya asal ditetapkan oleh editor manusia (tab Sumber) sebelum boleh terbit."
    });
  }

  let series: PlannedSeries | null = null;
  if (data.type === "bersiri") {
    const choice = options.series;
    if (!choice) {
      errors.push({ code: "series_choice_missing", message: "Pilih sama ada episod ini menyambung siri sedia ada atau memulakan siri baharu." });
    } else if (choice.kind === "sambung") {
      series = { kind: "sambung", seriesId: choice.seriesId };
    } else {
      const seriesTitle = present(choice.title) ?? data.series?.title;
      if (!seriesTitle) {
        errors.push({ code: "series_title_missing", message: "Tajuk siri diperlukan untuk siri baharu." });
      } else {
        series = {
          kind: "baharu",
          title: seriesTitle,
          slug: slugify(seriesTitle),
          mode: choice.mode ?? data.series?.mode ?? "continuous",
          dek: present(choice.dek) ?? data.series?.dek ?? null
        };
      }
    }
    if (errors.length > 0) return { ok: false, errors, warnings, plan: null, report: parsed.report };
  }

  const plan: ImportPlan = {
    work: {
      title: data.title,
      slug,
      type: data.type,
      genre: data.genre,
      audience: normalizeAudience(present(options.seriesDefaults?.audience) ?? data.audience),
      dek: data.dek,
      readingMinutes,
      body: bodyForWork,
      status: "draft"
    },
    credits,
    characters,
    glossary,
    places,
    times,
    sections: sections.map((s) => ({ slug: s.slug, title: s.title, position: s.position, body: s.body, words: s.words })),
    source: data.source,
    series,
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

  if (options.edits) applyEdits(plan, options.edits, foldedWhole, warnings);

  return { ok: true, errors, warnings, plan, report: parsed.report };
}

function applyEdits(plan: ImportPlan, edits: ReviewEdits, foldedText: string, warnings: ImportIssue[]): void {
  if (typeof edits.readingMinutes === "number" && edits.readingMinutes > 0 && edits.readingMinutes < 1000) {
    plan.work.readingMinutes = Math.round(edits.readingMinutes);
    plan.stats.readingMinutes = plan.work.readingMinutes;
  }

  if (edits.source && plan.source) {
    const clean = (v: string | null | undefined, old: string | null) => (v === undefined ? old : present(v) ?? null);
    plan.source = {
      title: clean(edits.source.title, plan.source.title),
      author: clean(edits.source.author, plan.source.author),
      language: clean(edits.source.language, plan.source.language),
      provenance: clean(edits.source.provenance, plan.source.provenance)
    };
    // Keep the original-author credit in step with the edited source author.
    const sourceCredit = plan.credits.find((c) => c.roleLabel === "author" && !c.byline);
    if (plan.source.author && sourceCredit) sourceCredit.guestName = plan.source.author;
  }

  if (edits.characters) {
    plan.characters = edits.characters
      .map((c) => ({ name: c.name.trim(), role: c.role.trim() }))
      .filter((c, i, all) => c.name && all.findIndex((o) => foldText(o.name) === foldText(c.name)) === i)
      .map((c) => ({
        ...c,
        firstAppearanceSection: plan.characters.find((o) => foldText(o.name) === foldText(c.name))?.firstAppearanceSection ?? null
      }));
  }

  const editedSettings = (list: { name: string; description?: string }[], max: number) => {
    const seenNames = new Set<string>();
    const out: { name: string; description?: string }[] = [];
    for (const item of list) {
      const name = String(item.name ?? "").trim().slice(0, 80);
      const key = name.toLocaleLowerCase("ms");
      if (!name || seenNames.has(key) || out.length >= max) continue;
      seenNames.add(key);
      const note = tidyShort(item.description ?? "").slice(0, 160);
      out.push(note ? { name, description: note } : { name });
    }
    return out;
  };
  if (edits.places) plan.places = editedSettings(edits.places, 12);
  if (edits.times) plan.times = editedSettings(edits.times, 6);

  if (edits.glossary) {
    const seen = new Set<string>();
    const next: ImportPlan["glossary"] = [];
    for (const g of edits.glossary) {
      const term = g.term.trim();
      const meaning = g.meaning.trim();
      if (!term || !meaning || seen.has(foldText(term))) continue;
      seen.add(foldText(term));
      if (!foldedText.includes(foldText(term))) {
        warnings.push({ code: "glossary_term_not_in_text", message: `Istilah glosari "${term}" tidak ditemui dalam teks; dilangkau.` });
        continue;
      }
      const pronunciation = g.pronunciation?.trim();
      const original = g.original?.trim();
      const originalLanguage = g.originalLanguage?.trim();
      next.push({
        term,
        meaning,
        source: "",
        sortOrder: next.length + 1,
        ...(pronunciation ? { pronunciation } : {}),
        ...(original ? { original } : {}),
        ...(original && originalLanguage ? { originalLanguage } : {})
      });
    }
    plan.glossary = next;
  }

  if (edits.visuals) {
    const kept: PlannedVisual[] = [];
    plan.visuals.forEach((v, index) => {
      const edit = edits.visuals![index];
      if (edit === null) return;
      if (edit) {
        if (edit.altText !== undefined) v.altText = edit.altText.trim();
        if (edit.place) v.place = edit.place;
        if (edit.aspectRatio) v.aspectRatio = edit.aspectRatio;
        if (edit.scene !== undefined && edit.scene.trim()) v.scenePrompt = edit.scene.trim();
        v.finalPrompt = composeVisualPrompt({
          sceneInstruction: v.scenePrompt,
          role: v.role,
          aspectRatio: v.aspectRatio as Parameters<typeof composeVisualPrompt>[0]["aspectRatio"],
          workTitle: plan.work.title,
          workType: plan.work.type
        }).finalPrompt;
      }
      kept.push(v);
    });
    plan.visuals = kept;
  }
}
