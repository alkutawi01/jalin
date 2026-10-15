/** Real embedded PostgreSQL, no Neon connection. PGLITE_MODULE points to an external test-only install. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Kysely, PostgresDialect } from "kysely";
import type { Database } from "../src/lib/db/types";
import { applyAssistantAnswer } from "../src/lib/admin/authoring/apply-answer";

async function main() {
  const require = createRequire(import.meta.url);
  if (!process.env.PGLITE_MODULE) throw new Error("PGLITE_MODULE is required; this test never connects to Neon.");
  const { PGlite } = require(process.env.PGLITE_MODULE);
  const pg = new PGlite();
  const client = { query: async (text: string, values: unknown[]) => { const r = await pg.query(text, values); return { rows: r.rows, rowCount: r.affectedRows ?? 0 }; }, release() {} };
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: { connect: async () => client, end: async () => pg.close() } as never }) });
  try {
    await pg.exec(`
      CREATE TABLE works (id text PRIMARY KEY, type text, title text, body text, dek text, genre text, metadata jsonb DEFAULT '{}', updated_at timestamptz);
      CREATE TABLE reading_sections (id serial PRIMARY KEY, work_id text REFERENCES works, slug text, title text, body text, position int);
      CREATE TABLE glossary_terms (id serial PRIMARY KEY, work_id text REFERENCES works, term text, meaning text CHECK (meaning <> 'DILARANG'), source text, sort_order int, created_at timestamptz, pronunciation text, original_text text, original_language text);
      CREATE TABLE source_works (id serial PRIMARY KEY, work_id text UNIQUE REFERENCES works, original_title text, author text, original_language text, publication_year int, source_edition text, source_url text, source_locator text, source_text_basis text, publisher text, edition_year int, printing text, editor_name text, translator_name text, isbn text, rights_status text, rights_notes text, rights_evidence text, rights_history jsonb, approved_material_hash text, reviewed_at timestamptz, reviewed_by text, created_at timestamptz, updated_at timestamptz);
      INSERT INTO works(id,type,title,body,metadata) VALUES ('test','fragmen','Ujian','Aina gundah dan gelisah di Seremban.', '{"editorNote":"kekalkan"}');
    `);
    const actor = { id: "test-only" };
    const input = { scope: "all" as const, expectedText: "Aina gundah dan gelisah di Seremban.", text: "[MAKLUMAT]\nDek: Dek baharu\nGenre: Misteri\n[WATAK]\nNama: Aina\nPeranan: Pemilik rumah\n[LATAR]\nJenis: tempat\nNama: Seremban\nKeterangan: Bandar tempat tinggal\n[GLOSARI]\nIstilah: gundah\nMaksud: Berasa resah\n____\nIstilah: gelisah\nMaksud: DILARANG" };
    const rows = async () => ({ work: await db.selectFrom("works").selectAll().execute(), glossary: await db.selectFrom("glossary_terms").selectAll().execute(), source: await db.selectFrom("source_works").selectAll().execute() });
    const original = await rows();
    await assert.rejects(() => applyAssistantAnswer("test", input, actor, true, db), /check constraint/i);
    assert.deepEqual(await rows(), original, "late glossary failure rolls back metadata, characters, settings AND first glossary insertion");
    const valid = { ...input, text: input.text.replace("DILARANG", "Berasa tidak tenang") + "\n[SUMBER]\nTajuk asal: Buku asal\nPengarang asal: Pengarang asal" };
    await assert.rejects(() => applyAssistantAnswer("test", valid, actor, false, db), /Peranan/);
    assert.deepEqual(await rows(), original, "source permission failure rolls back every earlier write");
    await assert.rejects(() => applyAssistantAnswer("test", { ...valid, expectedText: "versi lama" }, actor, true, db), /berubah/);
    assert.deepEqual(await rows(), original, "stale manuscript cannot write anything");
    await applyAssistantAnswer("test", valid, actor, true, db);
    const saved = await rows();
    assert.equal(saved.glossary.length, 2);
    assert.equal(saved.work[0].dek, "Dek baharu");
    assert.equal(saved.work[0].metadata?.editorNote, "kekalkan");
    assert.equal(saved.source[0].rights_status, "unknown");
    assert.equal(saved.source[0].reviewed_by, null);
    await applyAssistantAnswer("test", { ...valid, text: valid.text.replace("Dek baharu", "Jangan ganti") }, actor, true, db);
    assert.deepEqual(await rows(), saved, "retry is idempotent and existing metadata is not replaced");
    await applyAssistantAnswer("test", { ...valid, scope: "glossary", text: valid.text + "\n[MAKLUMAT]\nDek: Jangan ganti" }, actor, false, db);
    assert.deepEqual(await rows(), saved, "glossary-only scope cannot mutate other tabs");
    await db.updateTable("source_works").where("work_id", "=", "test").set({ rights_status: "public_domain", reviewed_by: "human", reviewed_at: new Date().toISOString(), approved_material_hash: "test-hash" }).execute();
    await applyAssistantAnswer("test", { ...valid, scope: "source", text: "[SUMBER]\nPenerbit: Penerbit baharu" }, actor, true, db);
    const sourceAfter = (await rows()).source[0];
    assert.equal(sourceAfter.rights_status, "needs_review", "source material changes invalidate an existing human approval");
    assert.equal(sourceAfter.reviewed_by, null);
    assert.equal(sourceAfter.approved_material_hash, null);
    console.log("Real PostgreSQL: late-error rollback, permissions, stale text, commit, retry, preservation, glossary scope and rights safety passed");
  } finally { await db.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
