/**
 * Apply ONE chatbot answer to an existing work: fills the empty details, adds glossary terms,
 * characters, the source (fragmen/sinopsis) and image requests. It never touches the work's text,
 * credits, rights decisions or images that already exist; it only adds or fills what is empty.
 */

import type { Kysely } from "kysely";
import type { Database } from "../../db/types";
import { composeVisualPrompt } from "../visual-generation/prompt-composer";
import { italicise } from "../authoring/glossary-paste";
import { upsertSourceProvenance } from "../source-rights";
import { resolveAnchor } from "./manuscript";
import { readParserAnswer } from "./parser-output";
import { countWords, estimateReadingMinutes, foldText } from "./text-utils";

export interface ApplyReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** One line per tab, already in Malay, for the editor. */
  lines: string[];
  counts: { glossary: number; characters: number; images: number };
}

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export async function applyAnswerToWork(
  db: Kysely<Database>,
  workId: string,
  answer: string,
  actor: { id: string; email?: string }
): Promise<ApplyReport> {
  const report: ApplyReport = { ok: false, errors: [], warnings: [], lines: [], counts: { glossary: 0, characters: 0, images: 0 } };

  const work = await db.selectFrom("works").where("id", "=", workId).selectAll().executeTakeFirst();
  if (!work) {
    report.errors.push("Karya tidak ditemui.");
    return report;
  }
  const type = String(work.type);

  const parsed = readParserAnswer(answer, { title: work.title, slug: work.slug });
  if (!parsed.data || parsed.errors.length > 0) {
    report.errors.push(...parsed.errors.map((e) => e.message));
    if (report.errors.length === 0) report.errors.push("Jawapan chatbot tidak dapat dibaca. Pastikan ia mengikut format yang diminta.");
    return report;
  }
  const data = parsed.data;
  report.warnings.push(...parsed.warnings.map((w) => w.message));
  if (data.type !== type) {
    report.errors.push(`Jawapan chatbot menyebut jenis ${data.type}, tetapi karya ini ialah ${type}. Jenis tidak ditukar. Minta chatbot menjawab semula untuk ${type}.`);
    return report;
  }

  const sections = await db.selectFrom("reading_sections").where("work_id", "=", workId).selectAll().orderBy("position", "asc").execute();
  const bodies = sections.length > 0
    ? sections.map((s) => ({ slug: String(s.slug), body: String(s.body ?? "") }))
    : [{ slug: "", body: String(work.body ?? "") }];
  const wholeText = bodies.map((b) => b.body).join("\n\n");
  const foldedWhole = foldText(wholeText);
  const sectionSlugs = new Set(sections.map((s) => String(s.slug)));
  const now = new Date().toISOString();

  // ---- Maklumat: fill only what is empty
  const filled: string[] = [];
  const kept: string[] = [];
  const update: Record<string, unknown> = {};
  if (!clean(work.dek) && clean(data.dek)) { update.dek = clean(data.dek); filled.push("dek"); } else if (clean(work.dek)) kept.push("dek");
  if (!clean(work.genre) && clean(data.genre)) { update.genre = clean(data.genre); filled.push("genre"); } else if (clean(work.genre)) kept.push("genre");
  if (!work.reading_minutes) {
    const minutes = estimateReadingMinutes(countWords(wholeText));
    if (minutes > 0) { update.reading_minutes = minutes; filled.push("minit bacaan"); }
  } else kept.push("minit bacaan");
  if (filled.length > 0) {
    await db.updateTable("works").where("id", "=", workId).set({ ...update, updated_at: now } as never).execute();
  }
  report.lines.push(`Maklumat: ${filled.length ? `${filled.join(", ")} diisi` : "tiada yang kosong untuk diisi"}${kept.length ? `; ${kept.join(", ")} sedia ada dikekalkan` : ""}.`);

  // ---- Glosari: new terms only; marked foreign words are italicised
  const existingTerms = await db.selectFrom("glossary_terms").where("work_id", "=", workId).select(["term", "sort_order"]).execute();
  const have = new Set(existingTerms.map((t) => foldText(String(t.term).replace(/\*/g, ""))));
  const knownNames = new Set([...data.characters.map((c) => c.name), ...data.locations].map((n) => foldText(n)));
  let sort = existingTerms.reduce((max, t) => Math.max(max, Number(t.sort_order ?? 0)), 0);
  const skippedGlossary: string[] = [];
  for (const g of data.glossary) {
    const key = foldText(g.term.replace(/\*/g, ""));
    if (!key || have.has(key)) { skippedGlossary.push(`${g.term} (sudah ada)`); continue; }
    if (knownNames.has(key)) { skippedGlossary.push(`${g.term} (nama)`); continue; }
    if (!foldedWhole.includes(key)) { skippedGlossary.push(`${g.term} (tiada dalam teks)`); continue; }
    have.add(key);
    sort += 1;
    await db.insertInto("glossary_terms").values({
      work_id: workId,
      term: italicise(g.term, g.foreign),
      meaning: italicise(g.meaning, g.foreign),
      source: "",
      sort_order: sort
    } as never).execute();
    report.counts.glossary += 1;
  }
  report.lines.push(`Glosari: ${report.counts.glossary} istilah ditambah${skippedGlossary.length ? `; dilangkau: ${skippedGlossary.join(", ")}` : ""}.`);

  // ---- Watak: new names only; first appearance must be a real chapter
  const metadata = ((work.metadata ?? {}) as Record<string, unknown>);
  const existingCharacters = Array.isArray(metadata.characters) ? (metadata.characters as { name: string; role: string; firstAppearanceSection?: string | null }[]) : [];
  const haveNames = new Set(existingCharacters.map((c) => foldText(c.name)));
  const newCharacters: { name: string; role: string; firstAppearanceSection: string | null }[] = [];
  for (const c of data.characters) {
    const key = foldText(c.name);
    if (!key || haveNames.has(key)) continue;
    haveNames.add(key);
    const first = type === "novela" && c.firstAppearanceSection && sectionSlugs.has(c.firstAppearanceSection) ? c.firstAppearanceSection : null;
    newCharacters.push({ name: c.name, role: c.role, firstAppearanceSection: first });
  }
  if (newCharacters.length > 0) {
    await db.updateTable("works").where("id", "=", workId)
      .set({ metadata: { ...metadata, characters: [...existingCharacters, ...newCharacters] } as never, updated_at: now })
      .execute();
  }
  report.counts.characters = newCharacters.length;
  report.lines.push(`Watak: ${newCharacters.length} ditambah${data.characters.length - newCharacters.length > 0 ? `; ${data.characters.length - newCharacters.length} sudah ada` : ""}.`);

  // ---- Sumber (fragmen and sinopsis): fill empty fields only; rights are never touched
  if ((type === "fragmen" || type === "sinopsis") && data.source) {
    const existing = await db.selectFrom("source_works").where("work_id", "=", workId).selectAll().executeTakeFirst();
    const input: Record<string, string> = {};
    const have = (v: string | null | undefined) => clean(v).length > 0;
    if (!have(existing?.original_title) && have(data.source.title)) input.originalTitle = clean(data.source.title);
    if (!have(existing?.author) && have(data.source.author)) input.author = clean(data.source.author);
    if (!have(existing?.original_language) && have(data.source.language)) input.originalLanguage = clean(data.source.language);
    if (!have(existing?.source_text_basis) && have(data.source.provenance)) input.sourceTextBasis = clean(data.source.provenance);
    if (Object.keys(input).length > 0) {
      try {
        await upsertSourceProvenance(workId, input, actor);
        report.lines.push(`Sumber: ${Object.keys(input).length} medan diisi. Hak masih perlu disemak manusia.`);
      } catch (error) {
        report.warnings.push(`Sumber tidak dapat disimpan: ${error instanceof Error ? error.message : "ralat tidak diketahui"}.`);
      }
    } else {
      report.lines.push("Sumber: tiada medan kosong untuk diisi (atau chatbot tidak tahu). Hak masih perlu disemak manusia.");
    }
  }

  // ---- Imej: new requests only; the system adds Jalin's standards when it generates
  const requests = await db.selectFrom("visual_requests").where("work_id", "=", workId).select(["visual_role", "anchor", "status", "approval_state"]).execute();
  const visuals = await db.selectFrom("visuals").where("work_id", "=", workId).select(["role", "anchor"]).execute();
  const usedAnchors = new Set<string>([...requests.map((r) => r.anchor ?? ""), ...visuals.map((v) => v.anchor ?? "")].filter(Boolean));
  let hasHero = visuals.some((v) => v.role === "hero") || requests.some((r) => r.visual_role === "hero" && r.status !== "rejected");
  const skippedImages: string[] = [];
  for (const [index, v] of data.visuals.entries()) {
    const label = `#${index + 1}`;
    if (v.role === "hero" && hasHero) { skippedImages.push(`${label} (hero sudah ada)`); continue; }
    let anchor: string | null = null;
    if (v.role === "inline") {
      if (!v.anchor) { skippedImages.push(`${label} (tiada petikan penempatan)`); continue; }
      const resolved = resolveAnchor(v.anchor, bodies, v.sectionSlug) ?? resolveAnchor(v.anchor.replace(/^["“”']+|["“”']+$/g, ""), bodies, v.sectionSlug);
      if (!resolved) { skippedImages.push(`${label} (petikan tiada dalam teks)`); continue; }
      if (usedAnchors.has(resolved.anchor)) { skippedImages.push(`${label} (tempat itu sudah ada gambar)`); continue; }
      anchor = resolved.anchor;
      usedAnchors.add(anchor);
    }
    if (!clean(v.altText)) { skippedImages.push(`${label} (tiada teks alternatif)`); continue; }
    const scene = [clean(v.scene)];
    if (clean(v.faceTreatment)) scene.push(`Face treatment: ${clean(v.faceTreatment)}.`);
    if (clean(v.notInScene)) scene.push(`Not in scene: ${clean(v.notInScene)}`);
    // Composed here only to validate that it builds; the full prompt is composed again at generation time.
    composeVisualPrompt({ sceneInstruction: scene.join(" "), role: v.role, aspectRatio: v.aspectRatio as "3:2", workTitle: work.title, workType: type });
    await db.insertInto("visual_requests").values({
      work_id: workId,
      submission_id: null,
      visual_role: v.role,
      prompt: scene.join(" "),
      provider: "magnific",
      provider_request_id: null,
      provider_creation_id: null,
      status: "draft",
      source_asset_url: null,
      source_asset_path: null,
      alt_text: clean(v.altText),
      anchor,
      place: v.place,
      approval_state: "pending",
      aspect_ratio: (v.aspectRatio || (v.role === "hero" ? "3:2" : "4:3")) as "3:2",
      model: null,
      execution_mode: "magnific_api",
      attempt_history: "[]",
      last_webhook_id: null,
      requested_by: actor.email || actor.id,
      retry_count: 0,
      asset_finalized: false,
      created_at: now,
      updated_at: now
    } as never).execute();
    if (v.role === "hero") hasHero = true;
    report.counts.images += 1;
  }
  report.lines.push(`Imej: ${report.counts.images} permintaan imej ditambah (draf, menunggu Generate)${skippedImages.length ? `; dilangkau: ${skippedImages.join(", ")}` : ""}.`);

  report.ok = true;
  return report;
}
