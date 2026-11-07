import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { getDb } from "../../db";
import type { Database } from "../../db/types";
import { readingMinutesFor } from "../../reader/reading-time";
import { imageMarkers } from "../../reader/image-markers";
import { bylineByDefault, isDerivativeType, roleNotAllowed } from "../../credit-roles";
import { isSourcedWork } from "../../content/source-origin";
import { characterProblems } from "../metadata-rules";
import { noteTooLongMessage, EDITOR_NOTE_LABEL, EDITOR_NOTE_MAX, READER_NOTE_LABEL, READER_NOTE_MAX } from "../note-limits";
import { validatePlaceEntries, validateTimeEntries } from "../work-service";
import { upsertSourceProvenance, validateSourceUrl, type SourceProvenanceInput } from "../source-rights";
import { loadAudienceBands } from "../../audience-store";
import { planEditorAnswer, placeEntryProblem, SOURCE_FIELDS, EDITOR_SCOPES, type EditorScope, type EditorState } from "./editor-assistant";
import { unescapeItalicMarks } from "../../reader/literal-emphasis";
import { normaliseCountries, MAX_COUNTRY_LENGTH } from "../../reader/countries";
import { DRAFT_REVIEW_KEY, draftReviews, hasUnresolvedReview, DraftImportProblem } from "./draft-review";

export interface EditorAnswerRequest { action: "preview" | "apply" | "resolve"; text: string; scope: EditorScope; selected?: string[]; version?: string; reviewVersion?: string }
export interface EditorAnswerPermissions { source: boolean; credits: boolean; glossary: boolean }
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const flag = (value: unknown, fallback: boolean): boolean => {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && /^(true|false|ya|tidak|yes|no)$/i.test(value.trim())) return /^(true|ya|yes)$/i.test(value.trim());
  throw new DraftImportProblem("Pilihan kredit mesti true/false atau ya/tidak.");
};
function preserveMarkers(before: string, after: string) {
  const markers = [...imageMarkers(before), ...(before.match(/\[\^[^\]\n]+\]/g) ?? [])];
  if (markers.some(marker => !after.includes(marker))) throw new DraftImportProblem("Jawapan manuskrip membuang penanda gambar/nota kaki. Betulkan dalam jawapan tersimpan; manuskrip sedia ada dikekalkan.");
  const definitions = before.match(/^\s{0,3}\[\^[^\]\n]+\]:/gm) ?? [];
  if (definitions.some(definition => !after.includes(definition.trim()))) throw new DraftImportProblem("Jawapan membuang isi nota kaki. Kekalkan definisinya.");
}
const WORK_STATUS_MS: Record<string, string> = { draft: "draf", review: "dalam semakan", ready: "sedia", published: "diterbitkan", archived: "diarkib" };

/**
 * An address another work already holds cannot be filled in. Told at the review step, with the work that holds it and a free
 * address to use instead, rather than after "Isi borang" had rolled everything back. The address change is left out of the list
 * (the rest still fills) and the editor is told in the notes.
 */
export async function dropTakenSlug<T extends { group: string; key: string; after: string }>(trx: Transaction<Database>, workId: string, changes: T[]): Promise<{ changes: T[]; notes: string[] }> {
  const change = changes.find(c => c.group === "content" && c.key === "slug");
  if (!change) return { changes, notes: [] };
  const wanted = change.after.trim();
  const holder = await trx.selectFrom("works").select(["title", "status", "type"]).where("slug", "=", wanted).where("id", "!=", workId).executeTakeFirst();
  if (!holder) return { changes, notes: [] };
  const rows = await trx.selectFrom("works").select("slug").where("slug", "like", `${wanted}-%`).execute();
  const used = new Set(rows.map(r => r.slug));
  let n = 2;
  while (used.has(`${wanted}-${n}`)) n++;
  const status = WORK_STATUS_MS[String(holder.status)] ?? String(holder.status);
  return {
    changes: changes.filter(c => c !== change),
    notes: [`Alamat pautan "${wanted}" tidak diisi: sudah dipakai oleh "${holder.title}" (${holder.type}, ${status}). Cadangan alamat lain: "${wanted}-${n}". Alamat sedia ada kekal.`]
  };
}

async function stateOf(trx: Transaction<Database>, id: string): Promise<EditorState> {
  const work = await trx.selectFrom("works").where("id", "=", id).selectAll().forUpdate().executeTakeFirst();
  if (!work) throw new Error("Karya tidak ditemui.");
  const chapters = await trx.selectFrom("reading_sections").where("work_id", "=", id).selectAll().orderBy("position").forUpdate().execute();
  const credits = await trx.selectFrom("credits").where("work_id", "=", id).selectAll().orderBy("id").execute();
  const glossary = await trx.selectFrom("glossary_terms").where("work_id", "=", id).selectAll().orderBy("id").execute();
  const source = await trx.selectFrom("source_works").where("work_id", "=", id).selectAll().forUpdate().executeTakeFirst();
  return { work, chapters, credits, glossary, source: source ?? null };
}
export async function processEditorAnswer(id: string, input: EditorAnswerRequest, actor: { id: string; email?: string }, permissions: EditorAnswerPermissions, db: Kysely<Database> = getDb()) {
  if (!EDITOR_SCOPES.includes(input.scope) || !["preview", "apply", "resolve"].includes(input.action) || typeof input.text !== "string" || (input.action !== "resolve" && !input.text.trim()) || input.text.length > 2_000_000) throw new Error("Jawapan atau skop tidak sah.");
  return db.transaction().execute(async trx => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"credits:" + id}))`.execute(trx);
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"glossary:" + id}))`.execute(trx);
    const state = await stateOf(trx, id);
    const version = createHash("sha256").update(JSON.stringify(state)).digest("hex");
    if (input.action === "resolve") {
      const reviews = { ...draftReviews(state.work.metadata) };
      const current = createHash("sha256").update(JSON.stringify(reviews[input.scope] ?? null)).digest("hex");
      if (current !== input.reviewVersion) throw new Error("Jawapan tersimpan berubah di tab lain. Muat jawapan terkini dan semak dahulu.");
      delete reviews[input.scope];
      await trx.updateTable("works").where("id", "=", id).set({ metadata: { ...state.work.metadata, [DRAFT_REVIEW_KEY]: reviews }, updated_at: new Date().toISOString() }).execute();
      return { version, changes: [], notes: ["Semakan jawapan ditandakan selesai. Semakan penerbitan masih diperlukan."] };
    }
    let planned: ReturnType<typeof planEditorAnswer> = [];
    const notes: string[] = [];
    try { planned = planEditorAnswer(input.text, input.scope, state, await loadAudienceBands()); }
    catch (error) {
      // A malformed answer is still recoverable in the editor, rather than lost at an error banner.
      if (!(error instanceof Error)) throw error;
      notes.push(error.message);
    }
    planned = planned.filter(c => (c.group !== "source" || (permissions.source && isSourcedWork(state.work.type, state.work.metadata))) && (c.group !== "credits" || permissions.credits) && (c.group !== "glossary" || permissions.glossary));
    const { changes, notes: slugNotes } = await dropTakenSlug(trx, id, planned);
    notes.push(...slugNotes);
    if (!changes.length && !notes.length && !/\[(?:KARYA|MAKLUMAT|WATAK|LATAR|GLOSARI|SUMBER|KREDIT|BAB)\]|"(?:work|title|slug|genre|glossary|characters|credits|sections|source)"\s*:/i.test(input.text)) notes.push("Tiada medan baharu dapat diisi. Jawapan disimpan untuk semakan editor.");
    if (input.action === "preview") return { version, changes, notes: [...notes, "Belum disimpan."] };
    if (input.version && input.version !== version) throw new Error("Karya berubah sejak jawapan dibaca. Tampal jawapan sekali lagi; tiada perubahan disimpan.");
    if (input.selected?.some(key => !changes.some(c => c.id === key))) throw new Error("Pilihan perubahan tidak sah.");
    // The editor has already read and deliberately pasted this answer. Apply every field in the
    // requested scope directly; the resulting ordinary form rows remain editable afterward.
    const chosen = input.selected?.length
      ? changes.filter(c => input.selected!.includes(c.id))
      : changes;
    const metadata = { ...(state.work.metadata ?? {}) };
    const patch: Record<string, any> = {};
    const sourcePatch: Record<string, string | number> = {};
    let sectionPosition = Math.max(0, ...state.chapters.map(c => c.position));
    let creditPosition = Math.max(0, ...state.credits.map(c => c.sort_order));
    let glossaryPosition = Math.max(0, ...state.glossary.map(c => c.sort_order));
    const now = new Date().toISOString();
    for (const change of chosen) {
      const row = change.value;
      try {
      if (change.group === "content" || change.group === "metadata") {
        if (change.key === "body") preserveMarkers(state.work.body ?? "", row);
        if (change.key === "slug") {
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row)) throw new DraftImportProblem("Alamat pautan tidak sah. Betulkan dalam jawapan tersimpan.");
          if (state.work.first_published_at || state.work.published_revision_id || state.work.status === "published") throw new DraftImportProblem("Alamat karya yang sudah diterbitkan dikekalkan. Cadangan alamat disimpan untuk semakan.");
          if (await trx.selectFrom("works").where("slug", "=", row).where("id", "!=", id).select("id").executeTakeFirst()) throw new DraftImportProblem("Alamat pautan sudah digunakan.");
        }
        if (change.key === "editorNote") metadata.editorNote = unescapeItalicMarks(String(row ?? ""));
        else if (change.key === "readerNote") patch.reader = { ...(state.work.reader ?? {}), note: String(row ?? "") };
        else patch[change.key] = row;
      } else if (change.group === "characters") {
        const key = change.key.split("/")[0]!;
        if (key === "countries") {
          if (row.some((value: string) => value.length > MAX_COUNTRY_LENGTH)) throw new DraftImportProblem("Nama negara latar terlalu panjang; nilai penuh disimpan untuk pembetulan.");
          metadata.countries = normaliseCountries(row);
          continue;
        }
        const current = Array.isArray(metadata[key]) ? [...metadata[key]] : [];
        const next = key === "characters" ? { name: clean(row.name), role: clean(row.role), firstAppearanceSection: clean(row.firstAppearanceSection) || null } : { name: clean(row.name), description: clean(row.description) };
        if (!next.name) throw new DraftImportProblem("Nama diperlukan; isian asal disimpan untuk pembetulan.");
        const index = current.findIndex(c => c.name.trim().toLocaleLowerCase() === next.name.toLocaleLowerCase());
        if (index < 0) current.push(next); else current[index] = { ...current[index], ...next };
        metadata[key] = current;
      } else if (change.group === "glossary") {
        const body = [patch.body ?? state.work.body, ...state.chapters.map(c => c.body), ...chosen.filter(c => c.group === "sections").map(c => c.value.body)].join("\n");
        const parsed = { term: clean(row.term), meaning: clean(row.meaning), pronunciation: clean(row.pronunciation), original: clean(row.original), originalLanguage: clean(row.originalLanguage) };
        if (!parsed.term) throw new DraftImportProblem("Istilah glosari belum diisi; isian asal disimpan untuk pembetulan.");
        if (!parsed.meaning || parsed.term.length > 80 || parsed.meaning.length > 600 || !body.toLocaleLowerCase().includes(parsed.term.replace(/\*/g, "").toLocaleLowerCase())) notes.push(`Glosari ${parsed.term}: semak istilah, maksud dan kemunculannya dalam manuskrip. Nilai penuh disimpan.`);
        const old = state.glossary.find(g => g.term.toLocaleLowerCase() === parsed.term.toLocaleLowerCase());
        const values = { term: parsed.term, meaning: parsed.meaning, pronunciation: parsed.pronunciation ?? null, original_text: parsed.original ?? null, original_language: parsed.originalLanguage ?? null };
        if (old) await trx.updateTable("glossary_terms").where("id", "=", old.id).set(values).execute();
        else await trx.insertInto("glossary_terms").values({ ...values, work_id: id, source: "", sort_order: ++glossaryPosition, created_at: now }).execute();
      } else if (change.group === "credits") {
        const slug = clean(row.contributorSlug), guest = clean(row.guestName), role = clean(row.roleLabel);
        if ((!slug && !guest) || (slug && guest) || !role) throw new DraftImportProblem("Kredit memerlukan satu identiti penyumbang dan peranan sebenar.");
        const problem = roleNotAllowed(state.work.type, role); if (problem) throw new DraftImportProblem(problem);
        if (slug && !await trx.selectFrom("contributors").where("slug", "=", slug).select("slug").executeTakeFirst()) throw new DraftImportProblem(`Penyumbang ${slug} tidak ditemui. Pilih penyumbang sedia ada dalam jawapan tersimpan.`);
        const values = { contributor_slug: slug || null, guest_name: guest || null, role_label: role, byline: !isDerivativeType(state.work.type) && flag(row.byline, bylineByDefault(role)), is_public: flag(row.isPublic, true) };
        const old = state.credits.find(c => (slug ? c.contributor_slug === slug : c.guest_name === guest) && c.role_label === role);
        if (old) await trx.updateTable("credits").where("id", "=", old.id).set(values).execute();
        else await trx.insertInto("credits").values({ ...values, work_id: id, sort_order: ++creditPosition, created_at: now }).execute();
      } else if (change.group === "sections") {
        const slug = clean(row.slug), old = state.chapters.find(c => c.slug === slug), body = clean(row.body) || old?.body;
        if (state.work.type !== "novela" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !body) throw new DraftImportProblem("Bab memerlukan novela, slug sah dan teks lengkap.");
        if (old) preserveMarkers(old.body, body);
        const values = { title: clean(row.title) || old?.title || null, body, reading_minutes: readingMinutesFor(undefined, body) ?? null, updated_at: now };
        if (old) await trx.updateTable("reading_sections").where("id", "=", old.id).set(values).execute();
        else await trx.insertInto("reading_sections").values({ ...values, slug, work_id: id, position: ++sectionPosition, created_at: now }).execute();
      } else if (change.group === "source") {
        if (!SOURCE_FIELDS[change.key] || !permissions.source) throw new Error("Tiada kebenaran mengubah sumber.");
        const year = ["publicationYear", "editionYear"].includes(change.key);
        const value = year && typeof row === "string" && /^-?\d{1,4}$/.test(row.trim()) ? Number(row) : row;
        if (year && (!Number.isInteger(value) || value < -4000 || value > 3000)) throw new DraftImportProblem("Tahun sumber tidak sah; isian asal disimpan untuk pembetulan.");
        if (!year && typeof value !== "string") throw new DraftImportProblem("Butiran sumber mesti berupa teks.");
        if (change.key === "sourceUrl") {
          const check = validateSourceUrl(String(value));
          if (!check.ok) throw new DraftImportProblem(check.reason ?? "URL sumber tidak sah.");
        }
        sourcePatch[change.key] = value;
      }
      } catch (error) {
        if (!(error instanceof DraftImportProblem)) throw error;
        notes.push(`${change.label}: ${error.message}`);
      }
    }
    for (const [validate, list] of [[validatePlaceEntries, metadata.places ?? []], [validateTimeEntries, metadata.times ?? []]] as const) {
      try { validate(list); } catch (error) { if (!(error instanceof Error)) throw error; notes.push(error.message); }
      for (const row of list) { const problem = placeEntryProblem(row); if (problem) notes.push(`${row.name}: ${problem}`); }
    }
    const chapters = await trx.selectFrom("reading_sections").where("work_id", "=", id).selectAll().execute();
    notes.push(...characterProblems(metadata.characters ?? [], chapters.map(c => c.slug)));
    if (String(metadata.editorNote ?? "").length > EDITOR_NOTE_MAX) notes.push(noteTooLongMessage(EDITOR_NOTE_LABEL, metadata.editorNote.length, EDITOR_NOTE_MAX));
    const readerNote = patch.reader?.note ?? state.work.reader?.note ?? "";
    if (readerNote.length > READER_NOTE_MAX) notes.push(noteTooLongMessage(READER_NOTE_LABEL, readerNote.length, READER_NOTE_MAX));
    const reviews = { ...draftReviews(metadata) };
    const previous = reviews[input.scope];
    reviews[input.scope] = {
      text: input.text, issues: [...new Set(notes)],
      ...(previous && previous.text !== input.text ? { previous: [{ text: previous.text, issues: previous.issues }, ...(previous.previous ?? [])].filter((entry, index, list) => hasUnresolvedReview(entry) && entry.text !== input.text && list.findIndex(other => other.text === entry.text) === index) } : previous?.previous ? { previous: previous.previous } : {})
    };
    // A later paste cannot silently erase an earlier unresolved answer. The editor
    // explicitly closes the review after correcting the ordinary fields.
    metadata[DRAFT_REVIEW_KEY] = reviews;
    await trx.updateTable("works").where("id", "=", id).set({ ...patch, metadata, reading_minutes: readingMinutesFor(undefined, patch.body ?? state.work.body, ...chapters.map(c => c.body)) ?? null, updated_at: now }).execute();
    if (Object.keys(sourcePatch).length) await upsertSourceProvenance(id, { ...sourcePatch, chatbotFields: Object.keys(sourcePatch) } as SourceProvenanceInput, actor, trx);
    return { version, changes: [], notes: [notes.length ? "Isian disimpan. Buka jawapan tersimpan untuk membetulkan catatan semakan; medan lain sudah diisi." : "Isian diisi dan disimpan. Karya tidak diterbitkan secara automatik.", ...new Set(notes)] };
  });
}
