/** Embedded PostgreSQL only. No production credentials or external database. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Kysely, PostgresDialect } from "kysely";
import type { Database } from "../src/lib/db/types";
import { processEditorAnswer } from "../src/lib/admin/authoring/editor-answer-service";
async function main() {
  if (!process.env.PGLITE_MODULE) throw new Error("External test-only PGLITE_MODULE required");
  const { PGlite } = createRequire(import.meta.url)(process.env.PGLITE_MODULE);
  const pg = new PGlite();
  const client = { query: async (text: string, values: unknown[]) => { const r = await pg.query(text, values); return { rows: r.rows, rowCount: r.affectedRows ?? 0 }; }, release() {} };
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: { connect: async () => client, end: async () => pg.close() } as never }) });
  try {
    await pg.exec(`
      CREATE TABLE works(id text PRIMARY KEY, type text, title text, slug text, status text, body text, dek text, genre text, metadata jsonb DEFAULT '{}', reader jsonb, reading_minutes int, updated_at timestamptz);
      CREATE TABLE contributors(slug text PRIMARY KEY);
      CREATE TABLE credits(id serial PRIMARY KEY, work_id text REFERENCES works, contributor_slug text REFERENCES contributors, guest_name text, role_label text, byline boolean, is_public boolean, sort_order int, created_at timestamptz);
      CREATE TABLE reading_sections(id serial PRIMARY KEY, work_id text REFERENCES works, slug text, title text, body text, position int, reading_minutes int, created_at timestamptz, updated_at timestamptz);
      CREATE TABLE glossary_terms(id serial PRIMARY KEY, work_id text REFERENCES works, term text, meaning text, source text, sort_order int, created_at timestamptz, pronunciation text, original_text text, original_language text);
      CREATE TABLE source_works(id serial PRIMARY KEY, work_id text UNIQUE REFERENCES works, original_title text, author text, original_language text, publication_year int, source_edition text, source_url text, source_locator text, source_text_basis text, publisher text, edition_year int, printing text, editor_name text, translator_name text, isbn text, rights_status text, rights_notes text, rights_evidence text, rights_history jsonb, approved_material_hash text, reviewed_at timestamptz, reviewed_by text, created_at timestamptz, updated_at timestamptz);
      INSERT INTO works(id,type,title,slug,status,body) VALUES ('test','novela','Lama','lama','draft','Aina gundah. [[gambar:1]] [^1]');
      INSERT INTO contributors VALUES ('chatgpt');
    `);
    const permissions = { source: true, credits: true, glossary: true }, actor = { id: "test-only" };
    const call = (input: any) => processEditorAnswer("test", input, actor, permissions, db);
    const snapshot = async () => JSON.stringify({ work: await db.selectFrom("works").selectAll().execute(), credits: await db.selectFrom("credits").selectAll().execute(), glossary: await db.selectFrom("glossary_terms").selectAll().execute(), chapters: await db.selectFrom("reading_sections").selectAll().execute() });
    const text = JSON.stringify({ work: { title: "Baharu", body: "Aina gundah lagi. [[gambar:1]] [^1]", genre: "Drama" }, credits: [{ contributorSlug: "chatgpt", roleLabel: "initial_draft", byline: true }], glossary: [{ term: "gundah", meaning: "Resah" }], sections: [{ slug: "bab-1", title: "Pulang", body: "Aina pulang." }] });
    const original = await snapshot();
    const preview = await call({ action: "preview", scope: "all", text });
    assert.equal(await snapshot(), original, "preview writes nothing");
    assert.equal(preview.changes.find(c => c.key === "title")?.selected, false);
    await assert.rejects(() => call({ action: "apply", scope: "all", text, selected: preview.changes.map(c => c.id), version: "old" }), /berubah/);
    assert.equal(await snapshot(), original);
    const bad = text.replace('"chatgpt"', '"missing"');
    const badPreview = await call({ action: "preview", scope: "all", text: bad });
    await assert.rejects(() => call({ action: "apply", scope: "all", text: bad, selected: badPreview.changes.map(c => c.id), version: badPreview.version }), /tidak ditemui/);
    assert.equal(await snapshot(), original, "late invalid credit rolls back body and glossary too");
    await call({ action: "apply", scope: "all", text, selected: preview.changes.map(c => c.id), version: preview.version });
    const work = await db.selectFrom("works").selectAll().executeTakeFirstOrThrow();
    assert.equal(work.title, "Baharu"); assert.equal(work.status, "draft"); assert.ok(work.reading_minutes! > 0);
    assert.equal((await db.selectFrom("credits").selectAll().execute()).length, 1);
    assert.equal((await db.selectFrom("glossary_terms").selectAll().execute()).length, 1);
    assert.equal((await db.selectFrom("reading_sections").selectAll().execute())[0].slug, "bab-1");
    const stored = await snapshot();
    const noMarker = JSON.stringify({ work: { body: "Teks tanpa penanda" } });
    const p = await call({ action: "preview", scope: "content", text: noMarker });
    await assert.rejects(() => call({ action: "apply", scope: "content", text: noMarker, selected: p.changes.map(c => c.id), version: p.version }), /penanda/);
    assert.equal(await snapshot(), stored);
    const scoped = await call({ action: "preview", scope: "metadata", text: JSON.stringify({ work: { title: "Jangan", genre: "Misteri" }, credits: [{ guestName: "Jangan", roleLabel: "initial_draft" }] }) });
    assert.deepEqual(scoped.changes.map(c => c.id), ["metadata:genre"]);
    await call({ action: "apply", scope: "metadata", text: JSON.stringify({ work: { title: "Jangan", genre: "Misteri" }, credits: [{ guestName: "Jangan", roleLabel: "initial_draft" }] }), selected: ["metadata:genre"], version: scoped.version });
    assert.equal((await db.selectFrom("works").selectAll().executeTakeFirstOrThrow()).title, "Baharu");
    await db.updateTable("works").where("id", "=", "test").set({ type: "fragmen" }).execute();
    const sourceText = JSON.stringify({ source: { originalTitle: "Buku asal", publicationYear: "1920", rightsStatus: "public_domain", reviewedBy: "AI" }, work: { title: "Jangan" } });
    const sourcePreview = await call({ action: "preview", scope: "source", text: sourceText });
    await call({ action: "apply", scope: "source", text: sourceText, selected: sourcePreview.changes.map(c => c.id), version: sourcePreview.version });
    const source = await db.selectFrom("source_works").selectAll().executeTakeFirstOrThrow();
    assert.equal(source.publication_year, 1920);
    assert.equal(source.rights_status, "unknown"); assert.equal(source.reviewed_by, null);
    await db.updateTable("source_works").where("work_id", "=", "test").set({ rights_status: "public_domain", reviewed_by: "human", reviewed_at: new Date().toISOString(), approved_material_hash: "hash" }).execute();
    const publisherText = JSON.stringify({ source: { publisher: "Penerbit baharu" } });
    const publisherPreview = await call({ action: "preview", scope: "source", text: publisherText });
    await call({ action: "apply", scope: "source", text: publisherText, selected: publisherPreview.changes.map(c => c.id), version: publisherPreview.version });
    assert.equal((await db.selectFrom("source_works").selectAll().executeTakeFirstOrThrow()).rights_status, "needs_review");
    console.log("Real PostgreSQL: preview, selected apply, rollback, stale version, markers, credits, glossary, chapters, scope and no publishing passed");
  } finally { await db.destroy(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
