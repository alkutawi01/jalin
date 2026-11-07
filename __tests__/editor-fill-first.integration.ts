/** Real PostgreSQL in memory. No environment file, Neon, production data or network access. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { Kysely, PostgresDialect } from "kysely";
import type { Database } from "../src/lib/db/types";
import { processEditorAnswer } from "../src/lib/admin/authoring/editor-answer-service";
import { draftReviews, withoutDraftReviews } from "../src/lib/admin/authoring/draft-review";
import { evaluatePublicationReadinessFromData } from "../src/lib/admin/publication-readiness";

async function main() {
  if (!process.env.PGLITE_MODULE) throw new Error("Set PGLITE_MODULE to an external test-only install. This test never connects to Neon.");
  const { PGlite } = createRequire(import.meta.url)(process.env.PGLITE_MODULE);
  const pg = new PGlite();
  const client = { query: async (text: string, values: unknown[]) => { const r = await pg.query(text, values); return { rows: r.rows, rowCount: r.affectedRows ?? 0 }; }, release() {} };
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: { connect: async () => client, end: async () => pg.close() } as never }) });
  let checks = 0;
  const check = (condition: unknown, label: string) => { assert.ok(condition, label); checks++; };
  try {
    await pg.exec(`
      CREATE TABLE works (id text PRIMARY KEY, slug text UNIQUE, type text, title text, status text DEFAULT 'draft', body text, dek text, genre text, audience text, reader jsonb DEFAULT '{}', metadata jsonb DEFAULT '{}', reading_minutes int, updated_at timestamptz, first_published_at timestamptz, published_revision_id int);
      CREATE TABLE reading_sections (id serial PRIMARY KEY, work_id text REFERENCES works, slug text, title text, body text, position int, reading_minutes int, created_at timestamptz, updated_at timestamptz);
      CREATE TABLE contributors (slug text PRIMARY KEY);
      CREATE TABLE credits (id serial PRIMARY KEY, work_id text REFERENCES works, contributor_slug text REFERENCES contributors, guest_name text, role_label text, byline boolean, is_public boolean, sort_order int, created_at timestamptz);
      CREATE TABLE glossary_terms (id serial PRIMARY KEY, work_id text REFERENCES works, term text NOT NULL, meaning text NOT NULL CHECK (meaning <> 'DATABASE_FAILURE_FIXTURE'), source text, sort_order int, created_at timestamptz, pronunciation text, original_text text, original_language text);
      CREATE TABLE source_works (id serial PRIMARY KEY, work_id text UNIQUE REFERENCES works, original_title text, author text, original_language text, publication_year int, source_edition text, source_url text, source_locator text, source_text_basis text, publisher text, edition_year int, printing text, editor_name text, translator_name text, isbn text, rights_status text, rights_notes text, rights_evidence text, rights_history jsonb, approved_material_hash text, reviewed_at timestamptz, reviewed_by text, created_at timestamptz, updated_at timestamptz);
      INSERT INTO works(id,slug,type,title,body) VALUES ('test','test','cerpen','Draf tanpa tajuk','Lina memandang tanggam di rumah itu.');
      INSERT INTO contributors VALUES ('editor-ujian');
    `);
    const actor = { id: "fixture-editor" };
    const permissions = { source: true, credits: true, glossary: true };
    const apply = (text: string, scope: "all" | "metadata" | "credits" | "source" = "all") => processEditorAnswer("test", { action: "apply", text, scope }, actor, permissions, db);
    const work = () => db.selectFrom("works").where("id", "=", "test").selectAll().executeTakeFirstOrThrow();
    const description = "Keterangan latar lengkap yang boleh dibetulkan oleh editor selepas disimpan. ".repeat(5).trim();
    const note = "Catatan panjang. ".repeat(350).trim();
    const answer = `[KARYA]\nTajuk: Rumah di Bukit\nSlug: rumah-di-bukit\nBlurb: Sebuah ujian rekaan.\n[MAKLUMAT]\nGenre: Drama keluarga, misteri\nCatatan: ${note}\nNota pembaca: ${"Nota pembaca. ".repeat(60).trim()}\n[WATAK]\nNama: Lina\nPeranan: Watak utama\n____\nNama: Amir\n[LATAR]\nJenis: tempat\nNama: Kota Ujian\nKeterangan: ${description}\n____\nJenis: masa\nNama: Zaman kontemporari\nKeterangan: ${description}\n[GLOSARI]\nIstilah: tanggam\nMaksud: ${"Sambungan kayu. ".repeat(60).trim()}\nAsing: tiada\n____\nIstilah: istilah-belum-ada\nMaksud:\n[SUMBER]\nTajuk asal: tidak dinyatakan\n[KREDIT]\ncredits: []`;
    const result = await apply(answer);
    let saved = await work();
    check(saved.title === "Rumah di Bukit" && saved.dek === "Sebuah ujian rekaan.", "content saves alongside invalid metadata");
    check((saved.metadata?.places as any[])[0].description === description && (saved.metadata?.times as any[])[0].description === description, "long place/time descriptions saved whole");
    check(saved.metadata?.editorNote === note, "long editor note saved whole");
    check((saved.metadata?.characters as any[]).some(c => c.name === "Amir" && c.role === ""), "incomplete character remains editable");
    const glossary = await db.selectFrom("glossary_terms").selectAll().execute();
    check(glossary.length === 2 && glossary.some(g => g.meaning.length > 600) && glossary.some(g => g.meaning === ""), "long and incomplete glossary entries saved without truncation");
    check(saved.body === "Lina memandang tanggam di rumah itu.", "metadata paste never replaces manuscript");
    check(draftReviews(saved.metadata).all.text === answer && result.notes.some(n => n.includes("disimpan")), "original answer recoverable after reload");
    check(!JSON.stringify(withoutDraftReviews(saved.metadata)).includes("assistantDraftReview"), "saved answer excluded from public metadata");
    const readiness = () => evaluatePublicationReadinessFromData({ work: { ...saved, status: "ready", version: "v1", published_at: null, editorial_history: [], reader: saved.reader as any }, credits: [], visuals: [], glossary: glossary as any, visualRequests: [], knownContributorSlugs: new Set<string>() });
    check(readiness().gates.content.blockers.some(b => b.code === "assistant_draft_review") && readiness().gates.content.blockers.some(b => b.code === "setting_needs_edit"), "import succeeds while publication remains blocked");
    await apply(JSON.stringify({ work: { dek: "Blurb kedua" }, credits: [{ contributorSlug: "belum-wujud", roleLabel: "initial_draft" }] }), "all");
    saved = await work();
    check(saved.dek === "Blurb kedua" && (await db.selectFrom("credits").selectAll().execute()).length === 0, "bad contributor does not cancel good fields or invent identity");
    check(draftReviews(saved.metadata).all.previous?.some(r => r.text === answer), "later paste preserves earlier unresolved answer");
    await apply(JSON.stringify({ credits: [{ contributorSlug: "editor-ujian", roleLabel: "initial_draft" }] }), "credits");
    check((await db.selectFrom("credits").selectAll().execute()).length === 1, "editor correction can be saved after initial import");
    await apply('{"work":{"title":', "metadata");
    check(draftReviews((await work()).metadata).metadata.text === '{"work":{"title":', "malformed answer saved for correction, not discarded");
    await db.updateTable("works").where("id", "=", "test").set({ type: "sinopsis" }).execute();
    await apply(JSON.stringify({ source: { publicationYear: "kurun lalu", publisher: "Penerbit ujian" } }), "source");
    check((await db.selectFrom("source_works").selectAll().executeTakeFirst())?.publisher === "Penerbit ujian", "invalid year does not cancel valid source fields");
    check(draftReviews((await work()).metadata).source.issues.some(n => n.includes("Tahun")), "invalid year is preserved in saved answer");
    const before = await work();
    await assert.rejects(() => apply(JSON.stringify({ work: { title: "Jangan simpan" }, glossary: [{ term: "tanggam", meaning: "DATABASE_FAILURE_FIXTURE" }] })), /check constraint/i);
    check((await work()).title === before.title, "real database failure is not reported as successful import");
    await assert.rejects(() => processEditorAnswer("missing", { action: "apply", scope: "all", text: answer }, actor, permissions, db), /Karya tidak ditemui/);
    checks++;
    await assert.rejects(() => processEditorAnswer("test", { action: "resolve", text: "", scope: "metadata", reviewVersion: "stale" }, actor, permissions, db), /berubah/);
    checks++;
    const reviewVersion = createHash("sha256").update(JSON.stringify(draftReviews((await work()).metadata).metadata)).digest("hex");
    await processEditorAnswer("test", { action: "resolve", text: "", scope: "metadata", reviewVersion }, actor, permissions, db);
    check(!draftReviews((await work()).metadata).metadata && !!draftReviews((await work()).metadata).all, "editor explicitly resolves one scope without erasing others");
    console.log(`PASS: ${checks} embedded PostgreSQL checks; no Neon connection or production writes.`);
  } finally { await db.destroy(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Test failed"); process.exitCode = 1; });
