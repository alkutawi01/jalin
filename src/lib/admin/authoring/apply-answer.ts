import { sql, type Kysely } from "kysely";
import type { Database } from "../../db/types";
import { getDb } from "../../db";
import { capitaliseFirst, tidyShort } from "../../capitalise-first";
import { isSourcedWork } from "../../content/source-origin";
import { validatePlaceEntries, validateTimeEntries } from "../work-service";
import { sameTerm } from "../metadata-rules";
import { upsertSourceProvenance, type SourceProvenanceInput } from "../source-rights";
import { assistantManuscript } from "./assistant-manuscript";
import { FILL_SECTIONS, looksLikePrompt, parseWorkFill, type WorkFillScope } from "./work-fill";
import { parseGlossaryPaste } from "./glossary-paste";

export interface ApplyAnswerInput {
  text: string;
  scope: WorkFillScope | "glossary";
  expectedText: string;
  /** Unsaved editor metadata must not be replaced either. Server also checks stored fields. */
  preserve?: string[];
}

/** All writes happen in one transaction. Lock and re-read: no stale client lists can replace newer data. */
export async function applyAssistantAnswer(workId: string, input: ApplyAnswerInput, actor: { id: string; email?: string }, allowSource: boolean, db: Kysely<Database> = getDb()) {
  if (!input.text?.trim() || input.text.length > 2_000_000 || looksLikePrompt(input.text)) throw new Error("Salin jawapan bot sembang, bukan arahannya.");
  if (input.scope !== "glossary" && !Object.hasOwn(FILL_SECTIONS, input.scope)) throw new Error("Skop jawapan tidak sah.");
  return db.transaction().execute(async trx => {
    // Same lock order as the ordinary glossary writer.
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"glossary:" + workId}))`.execute(trx);
    const work = await trx.selectFrom("works").where("id", "=", workId).selectAll().forUpdate().executeTakeFirst();
    if (!work) throw new Error("Karya tidak ditemui.");
    const chapters = await trx.selectFrom("reading_sections").where("work_id", "=", workId).selectAll().orderBy("position").forUpdate().execute();
    const manuscript = assistantManuscript(work.type, work.body ?? "", chapters);
    if (input.expectedText !== manuscript) throw new Error("Teks karya atau bab berubah sejak semakan, atau belum disimpan. Simpan teks, muat semula dan semak jawapan sekali lagi. Tiada perubahan disimpan.");
    const parsed = parseWorkFill(input.text, input.scope === "glossary" ? "all" : input.scope);
    if (input.scope !== "glossary" && !parsed.sections.length) throw new Error("Tiada bahagian yang dapat dibaca untuk skop ini.");
    const notes: string[] = [];
    const metadata = { ...((work.metadata ?? {}) as Record<string, unknown>) };
    const patch: Record<string, unknown> = {};
    const metadataPatch: Record<string, string> = {};
    if (input.scope !== "glossary") {
      for (const key of ["dek", "genre"] as const) {
        if (parsed[key] && !work[key]?.trim() && !input.preserve?.includes(key)) { patch[key] = parsed[key]; metadataPatch[key] = parsed[key]; notes.push(`${key === "dek" ? "Dek" : "Genre"}: diisi.`); }
      }
      const merge = (key: "characters" | "places" | "times", fresh: Array<{ name: string }>) => {
        const existing = Array.isArray(metadata[key]) ? metadata[key] as Array<{ name: string }> : [];
        const added = fresh.filter(row => !existing.some(have => sameTerm(have.name, row.name)));
        if (added.length) { metadata[key] = [...existing, ...added]; patch.metadata = metadata; }
        notes.push(`${key}: ${added.length} ditambah; rekod sedia ada dikekalkan.`);
      };
      if (parsed.sections.includes("WATAK")) {
        const slugs = new Set(chapters.map(c => c.slug));
        merge("characters", parsed.characters.map(c => ({ name: c.name, role: tidyShort(c.role), firstAppearanceSection: work.type === "novela" && slugs.has(c.first) ? c.first : null })));
      }
      if (parsed.sections.includes("LATAR")) {
        merge("places", parsed.places);
        merge("times", parsed.times);
        validatePlaceEntries(metadata.places ?? []);
        validateTimeEntries(metadata.times ?? []);
      }
    }
    if (Object.keys(patch).length) await trx.updateTable("works").where("id", "=", workId).set({ ...patch, updated_at: new Date().toISOString() }).execute();
    if (input.scope === "glossary" || parsed.sections.includes("GLOSARI")) {
      const have = await trx.selectFrom("glossary_terms").where("work_id", "=", workId).selectAll().execute();
      const glossary = parseGlossaryPaste(input.scope === "glossary" ? input.text : parsed.glossaryText, manuscript, have.map(t => t.term));
      const start = Math.max(0, ...have.map(t => t.sort_order));
      for (const [i, item] of glossary.items.entries()) {
        await trx.insertInto("glossary_terms").values({ work_id: workId, term: item.term, meaning: capitaliseFirst(item.meaning), source: "", sort_order: start + i + 1, created_at: new Date().toISOString(), ...(item.pronunciation ? { pronunciation: item.pronunciation } : {}), ...(item.original ? { original_text: item.original } : {}), ...(item.originalLanguage ? { original_language: item.originalLanguage } : {}) }).execute();
      }
      if (!glossary.none && !glossary.items.length && !glossary.existing.length && !glossary.notInText.length) throw new Error("Tiada glosari yang dapat dibaca. Tiada perubahan disimpan.");
      notes.push(`Glosari: ${glossary.items.length} ditambah; ${glossary.existing.length} sudah ada; ${glossary.notInText.length} tiada dalam teks; ${glossary.unreadable} blok tidak dapat dibaca.`);
    }
    if (input.scope !== "glossary" && parsed.source && isSourcedWork(work.type, work.metadata)) {
      if (!allowSource) throw new Error("Peranan anda tidak dibenarkan mengisi sumber. Pilih skop Maklumat, Watak atau Glosari. Tiada perubahan disimpan.");
      const source = await trx.selectFrom("source_works").where("work_id", "=", workId).selectAll().forUpdate().executeTakeFirst();
      const src = parsed.source;
      const fields = [
        ["originalTitle", "original_title", src.title], ["author", "author", src.author], ["originalLanguage", "original_language", src.language], ["sourceTextBasis", "source_text_basis", src.basis], ["publicationYear", "publication_year", src.firstPublished], ["publisher", "publisher", src.publisher], ["editionYear", "edition_year", src.editionYear], ["printing", "printing", src.printing], ["editorName", "editor_name", src.editor], ["translatorName", "translator_name", src.translator], ["isbn", "isbn", src.isbn], ["sourceLocator", "source_locator", src.locator]
      ] as const;
      const values: Record<string, string | number> = {};
      for (const [key, column, value] of fields) if (value !== null && value !== "" && !String(source?.[column] ?? "").trim()) values[key] = value;
      if (Object.keys(values).length) {
        const outcome = await upsertSourceProvenance(workId, { ...values, chatbotFields: Object.keys(values) } as SourceProvenanceInput, actor, trx);
        notes.push(`Sumber: ${Object.keys(values).length} medan diisi.${outcome.invalidatedApproval ? " Identiti sumber berubah; semakan hak perlu diulang." : " Hak tidak diluluskan oleh AI."}`);
      }
    }
    return { notes, metadataPatch };
  });
}
