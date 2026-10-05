/**
 * Controlled test: editing a published work must NOT change what the public sees.
 *
 * Needs a throwaway database (a Neon branch), never production. Run with
 *   AUDIT_ENV=/path/to/file-with-DATABASE_URL npx tsx scripts/controlled-public-snapshot-test.ts
 *
 * Walks one test work through publish, edits the working copy (body, title, dek, credits,
 * glossary, visuals) and checks the public repository still serves the published snapshot until
 * the work is published again.
 */
import { assertDisposableFixtures } from "./lib/disposable-fixture";
import { config } from "dotenv";
if (process.env.AUDIT_ENV) config({ path: process.env.AUDIT_ENV, override: true });
else config({ path: ".env.local" });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import { publishWorkExplicit, republishWork } from "../src/lib/admin/publication-service";
import { getUnpublishedChanges } from "../src/lib/admin/revision-service";
import { updateWork } from "../src/lib/admin/work-service";
import { DatabaseContentRepository } from "../src/lib/content/database-repository";

const ID = "work-uji-snapshot-leak";
const SLUG = "uji-snapshot-bocor";
const DURABLE_SRC =
  "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png";
let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

async function publicWork() {
  process.env.CONTENT_SOURCE = "database";
  const repo = new DatabaseContentRepository();
  await repo.init();
  return repo.getWork(SLUG);
}

async function main() {
  if (!hasDb()) throw new Error("DATABASE_URL tiada");
  if (/br-nameless-boat/.test(process.env.DATABASE_URL ?? "") && !process.env.ALLOW_PRODUCTION_BRANCH) {
    // The primary production branch has a different endpoint host from branches; this guards against pasting it.
    console.warn("  ! pastikan DATABASE_URL ialah branch ujian, bukan production");
  }
  const db = getDb();
  const now = new Date().toISOString();
  await assertDisposableFixtures(db, { ids: [ID], slugs: [SLUG] });

  for (const t of ["credits", "visuals", "glossary_terms", "visual_requests", "work_revisions", "reading_sections"]) {
    await db.deleteFrom(t as never).where("work_id" as never, "=", ID as never).execute();
  }
  await db.deleteFrom("works").where("id", "=", ID).execute();

  console.log("\n=== Public snapshot isolation ===");
  await db
    .insertInto("works")
    .values({
      id: ID, slug: SLUG, title: "Tajuk Asal Terbit", type: "cerpen", status: "ready",
      body: "Badan asal yang diterbitkan. " + "Ayat isi ".repeat(20).trim(),
      dek: "Dek asal.", genre: "Keluarga", audience: "remaja", reading_minutes: 2, version: "v1.0",
      editorial_history: JSON.stringify([{ version: "v1.0", type: "initial", summary: "Ujian", date: now }]),
      published_at: null, published_by: null, updated_at: now, created_at: now
    } as never)
    .execute();
  await db.insertInto("credits").values({ work_id: ID, contributor_slug: null, guest_name: "Penulis Ujian", role_label: "Author", byline: true, is_public: true, sort_order: 0 } as never).execute();
  await db.insertInto("visuals").values({ work_id: ID, role: "hero", src: DURABLE_SRC, alt: "Ilustrasi ujian", provider: "manual", place: "after", sort_order: 0, is_asset_finalized: true } as never).execute();
  await db.insertInto("glossary_terms").values({ work_id: ID, term: "ujian", meaning: "percubaan", source: "Kamus Dewan", sort_order: 0 } as never).execute();

  await publishWorkExplicit(ID, { id: "snapshot-test", email: "editor@jalin.local" });
  let pub = await publicWork();
  check(!!pub, "karya terbit boleh dibaca awam");
  const rev = await db.selectFrom("works").where("id", "=", ID).select(["published_revision_id", "revision_count", "first_published_at"]).executeTakeFirst();
  check(!!rev?.published_revision_id, "penerbitan membekukan versi (published_revision_id ditetapkan)");
  check(!!rev?.first_published_at, "tarikh terbit pertama direkod");
  check((await getUnpublishedChanges(ID)).changed === false, "tiada perubahan belum terbit selepas terbit");

  // The frozen version must map to exactly the same public work as the live rows do.
  const frozenJson = JSON.stringify(pub);
  await db.updateTable("works").where("id", "=", ID).set({ published_revision_id: null } as never).execute();
  const liveMapped = await publicWork();
  await db.updateTable("works").where("id", "=", ID).set({ published_revision_id: rev?.published_revision_id } as never).execute();
  const strip = (w: unknown) => { const o = JSON.parse(JSON.stringify(w)); for (const k of ["publishedRevisionId", "revisionCount", "versionLabel", "firstPublishedAt", "publishedAt", "updatedAt"]) delete o[k]; return JSON.stringify(o); };
  check(strip(JSON.parse(frozenJson)) === strip(liveMapped), "versi beku dipetakan sama seperti baris langsung (tiada kehilangan medan)");
  check(pub?.title === "Tajuk Asal Terbit", "tajuk awam ialah versi terbit");
  check((pub?.body ?? "").startsWith("Badan asal"), "badan awam ialah versi terbit");

  // Editor continues working on the draft copy.
  await updateWork(ID, { body: "DRAF BARU belum diterbitkan. " + "Ayat ".repeat(20), title: "Tajuk Draf Baru", dek: "Dek draf baru." });
  await db.insertInto("credits").values({ work_id: ID, contributor_slug: null, guest_name: "Penyunting Draf", role_label: "Editor", byline: true, is_public: true, sort_order: 1 } as never).execute();
  await db.insertInto("glossary_terms").values({ work_id: ID, term: "draf", meaning: "salinan kerja", source: "Kamus Dewan", sort_order: 1 } as never).execute();
  await db.updateTable("visuals").where("work_id", "=", ID).set({ alt: "Teks alt draf baru" } as never).execute();

  pub = await publicWork();
  check(pub?.title === "Tajuk Asal Terbit", "tajuk draf tidak bocor");
  check((pub?.body ?? "").startsWith("Badan asal"), "badan draf tidak bocor");
  check(pub?.dek === "Dek asal.", "dek draf tidak bocor");
  check(!(pub?.credits ?? []).some((c) => /Penyunting Draf/.test(JSON.stringify(c))), "kredit draf tidak bocor");
  check(!(pub?.glossary ?? []).some((g) => g.term === "draf"), "glosari draf tidak bocor");
  check(!(pub?.visuals ?? []).some((v) => v.alt === "Teks alt draf baru"), "teks alt draf tidak bocor");
  check((await getUnpublishedChanges(ID)).changed === true, "perubahan belum terbit dikesan");

  // Publishing again makes the new version public.
  const re = await republishWork(ID, { id: "snapshot-test", email: "editor@jalin.local" }, { summary: "Ujian terbit semula", changeType: "minor" });
  check(re.changed, "terbit semula mencipta versi baharu");
  pub = await publicWork();
  check(pub?.title === "Tajuk Draf Baru", "selepas terbit semula, awam melihat tajuk baharu");
  check((pub?.credits ?? []).length === 2, "selepas terbit semula, kredit baharu kelihatan");
  check((await getUnpublishedChanges(ID)).changed === false, "tiada perubahan tertunggak selepas terbit semula");
  const again = await republishWork(ID, { id: "snapshot-test", email: "editor@jalin.local" });
  check(again.changed === false, "terbit semula tanpa perubahan tidak mencipta versi");

  await db.updateTable("works").where("id", "=", ID).set({ status: "archived", updated_at: new Date().toISOString() }).execute();
  await closeDb?.();
  if (failures) {
    console.error(`\n${failures} semakan gagal`);
    process.exit(1);
  }
  console.log("\nSemua semakan lulus");
}
main().catch((e) => { console.error(e); process.exit(1); });
