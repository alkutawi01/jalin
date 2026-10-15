import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { getDb } from "../../db";
import type { Database } from "../../db/types";
import { readingMinutesFor } from "../../reader/reading-time";
import { imageMarkers } from "../../reader/image-markers";
import { isDerivativeType, roleNotAllowed } from "../../credit-roles";
import { isSourcedWork } from "../../content/source-origin";
import { characterProblems } from "../metadata-rules";
import { validatePlaceEntries, validateTimeEntries } from "../work-service";
import { upsertSourceProvenance, type SourceProvenanceInput } from "../source-rights";
import { planEditorAnswer, SOURCE_FIELDS, EDITOR_SCOPES, type EditorScope, type EditorState } from "./editor-assistant";
import { parseGlossaryPaste } from "./glossary-paste";
import { normaliseCountries, MAX_COUNTRY_LENGTH } from "../../reader/countries";

export interface EditorAnswerRequest { action: "preview" | "apply"; text: string; scope: EditorScope; selected?: string[]; version?: string }
export interface EditorAnswerPermissions { source: boolean; credits: boolean; glossary: boolean }
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const flag = (value: unknown, fallback: boolean): boolean => {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && /^(true|false|ya|tidak|yes|no)$/i.test(value.trim())) return /^(true|ya|yes)$/i.test(value.trim());
  throw new Error("Pilihan kredit mesti true/false atau ya/tidak.");
};
function preserveMarkers(before: string, after: string) {
  const markers = [...imageMarkers(before), ...(before.match(/\[\^[^\]\n]+\]/g) ?? [])];
  if (markers.some(marker => !after.includes(marker))) throw new Error("Jawapan membuang penanda gambar/nota kaki. Minta AI mengekalkannya; tiada perubahan disimpan.");
  const definitions = before.match(/^\s{0,3}\[\^[^\]\n]+\]:/gm) ?? [];
  if (definitions.some(definition => !after.includes(definition.trim()))) throw new Error("Jawapan membuang isi nota kaki. Minta AI mengekalkan definisinya.");
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
  if (!EDITOR_SCOPES.includes(input.scope) || !["preview", "apply"].includes(input.action) || typeof input.text !== "string" || !input.text.trim() || input.text.length > 2_000_000) throw new Error("Jawapan atau skop tidak sah.");
  return db.transaction().execute(async trx => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"credits:" + id}))`.execute(trx);
    await sql`SELECT pg_advisory_xact_lock(hashtext(${"glossary:" + id}))`.execute(trx);
    const state = await stateOf(trx, id);
    const version = createHash("sha256").update(JSON.stringify(state)).digest("hex");
    const planned = planEditorAnswer(input.text, input.scope, state).filter(c => (c.group !== "source" || (permissions.source && isSourcedWork(state.work.type, state.work.metadata))) && (c.group !== "credits" || permissions.credits) && (c.group !== "glossary" || permissions.glossary));
    const { changes, notes: slugNotes } = await dropTakenSlug(trx, id, planned);
    if (!changes.length) throw new Error(slugNotes[0] ?? "Tiada perubahan medan yang dapat dibaca untuk tab ini. Salin jawapan penuh atau semak formatnya.");
    if (input.action === "preview") return { version, changes, notes: [...slugNotes, "Belum disimpan. Semak ringkasan sebelum mengisi borang."] };
    if (input.version !== version) throw new Error("Karya berubah sejak pratonton. Semak jawapan sekali lagi; tiada perubahan disimpan.");
    if (!Array.isArray(input.selected) || !input.selected.length || input.selected.some(key => !changes.some(c => c.id === key))) throw new Error("Pilih perubahan yang sah sebelum mengisi borang.");
    const chosen = changes.filter(c => input.selected!.includes(c.id));
    const metadata = { ...(state.work.metadata ?? {}) };
    const patch: Record<string, any> = {};
    const sourcePatch: Record<string, string | number> = {};
    let sectionPosition = Math.max(0, ...state.chapters.map(c => c.position));
    let creditPosition = Math.max(0, ...state.credits.map(c => c.sort_order));
    let glossaryPosition = Math.max(0, ...state.glossary.map(c => c.sort_order));
    const now = new Date().toISOString();
    for (const change of chosen) {
      const row = change.value;
      if (change.group === "content" || change.group === "metadata") {
        if (change.key === "body") preserveMarkers(state.work.body ?? "", row);
        if (change.key === "slug") {
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row)) throw new Error("Alamat pautan tidak sah.");
          if (state.work.first_published_at || state.work.published_revision_id || state.work.status === "published") throw new Error("Alamat karya yang sudah diterbitkan dikekalkan. Nyahpilih perubahan alamat pautan.");
          if (await trx.selectFrom("works").where("slug", "=", row).where("id", "!=", id).select("id").executeTakeFirst()) throw new Error("Alamat pautan sudah digunakan.");
        }
        if (change.key === "editorNote") metadata.editorNote = row;
        else if (change.key === "readerNote") patch.reader = { ...(state.work.reader ?? {}), note: row };
        else patch[change.key] = row;
      } else if (change.group === "characters") {
        const key = change.key.split("/")[0]!;
        if (key === "countries") {
          if (row.some((value: string) => value.length > MAX_COUNTRY_LENGTH)) throw new Error("Nama negara latar terlalu panjang.");
          metadata.countries = normaliseCountries(row);
          continue;
        }
        const current = Array.isArray(metadata[key]) ? [...metadata[key]] : [];
        const next = key === "characters" ? { name: clean(row.name), role: clean(row.role), firstAppearanceSection: clean(row.firstAppearanceSection) || null } : { name: clean(row.name), description: clean(row.description) };
        if (!next.name || (key === "characters" && !("role" in next && next.role))) throw new Error("Watak mesti mempunyai nama dan peranan.");
        const index = current.findIndex(c => c.name.trim().toLocaleLowerCase() === next.name.toLocaleLowerCase());
        if (index < 0) current.push(next); else current[index] = { ...current[index], ...next };
        metadata[key] = current;
      } else if (change.group === "glossary") {
        const body = [patch.body ?? state.work.body, ...state.chapters.map(c => c.body), ...chosen.filter(c => c.group === "sections").map(c => c.value.body)].join("\n");
        const parsed = parseGlossaryPaste(JSON.stringify({ glossary: [row] }), body, []).items[0];
        if (!parsed) throw new Error(`Glosari ${clean(row.term)} tidak lengkap atau tiada dalam teks. Nyahpilih atau betulkan jawapan.`);
        const old = state.glossary.find(g => g.term.toLocaleLowerCase() === parsed.term.toLocaleLowerCase());
        const values = { term: parsed.term, meaning: parsed.meaning, pronunciation: parsed.pronunciation ?? null, original_text: parsed.original ?? null, original_language: parsed.originalLanguage ?? null };
        if (old) await trx.updateTable("glossary_terms").where("id", "=", old.id).set(values).execute();
        else await trx.insertInto("glossary_terms").values({ ...values, work_id: id, source: "", sort_order: ++glossaryPosition, created_at: now }).execute();
      } else if (change.group === "credits") {
        const slug = clean(row.contributorSlug), guest = clean(row.guestName), role = clean(row.roleLabel);
        if ((!slug && !guest) || (slug && guest) || !role) throw new Error("Kredit memerlukan satu identiti penyumbang dan peranan sebenar.");
        const problem = roleNotAllowed(state.work.type, role); if (problem) throw new Error(problem);
        if (slug && !await trx.selectFrom("contributors").where("slug", "=", slug).select("slug").executeTakeFirst()) throw new Error(`Penyumbang ${slug} tidak ditemui.`);
        const values = { contributor_slug: slug || null, guest_name: guest || null, role_label: role, byline: !isDerivativeType(state.work.type) && flag(row.byline, false), is_public: flag(row.isPublic, true) };
        const old = state.credits.find(c => (slug ? c.contributor_slug === slug : c.guest_name === guest) && c.role_label === role);
        if (old) await trx.updateTable("credits").where("id", "=", old.id).set(values).execute();
        else await trx.insertInto("credits").values({ ...values, work_id: id, sort_order: ++creditPosition, created_at: now }).execute();
      } else if (change.group === "sections") {
        const slug = clean(row.slug), old = state.chapters.find(c => c.slug === slug), body = clean(row.body) || old?.body;
        if (state.work.type !== "novela" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !body) throw new Error("Bab memerlukan novela, slug sah dan teks lengkap.");
        if (old) preserveMarkers(old.body, body);
        const values = { title: clean(row.title) || old?.title || null, body, reading_minutes: readingMinutesFor(undefined, body) ?? null, updated_at: now };
        if (old) await trx.updateTable("reading_sections").where("id", "=", old.id).set(values).execute();
        else await trx.insertInto("reading_sections").values({ ...values, slug, work_id: id, position: ++sectionPosition, created_at: now }).execute();
      } else if (change.group === "source") {
        if (!SOURCE_FIELDS[change.key] || !permissions.source) throw new Error("Tiada kebenaran mengubah sumber.");
        const year = ["publicationYear", "editionYear"].includes(change.key);
        const value = year && typeof row === "string" && /^-?\d{1,4}$/.test(row.trim()) ? Number(row) : row;
        if (year && (!Number.isInteger(value) || value < -4000 || value > 3000)) throw new Error("Tahun sumber tidak sah.");
        if (!year && typeof value !== "string") throw new Error("Butiran sumber mesti berupa teks.");
        sourcePatch[change.key] = value;
      }
    }
    validatePlaceEntries(metadata.places ?? []); validateTimeEntries(metadata.times ?? []);
    const chapters = await trx.selectFrom("reading_sections").where("work_id", "=", id).selectAll().execute();
    const problems = characterProblems(metadata.characters ?? [], chapters.map(c => c.slug)); if (problems.length) throw new Error(problems.join(" "));
    await trx.updateTable("works").where("id", "=", id).set({ ...patch, metadata, reading_minutes: readingMinutesFor(undefined, patch.body ?? state.work.body, ...chapters.map(c => c.body)) ?? null, updated_at: now }).execute();
    if (Object.keys(sourcePatch).length) await upsertSourceProvenance(id, { ...sourcePatch, chatbotFields: Object.keys(sourcePatch) } as SourceProvenanceInput, actor, trx);
    return { version, changes: [], notes: [`${chosen.length} perubahan diisi dan disimpan. Karya tidak diterbitkan secara automatik.`] };
  });
}
