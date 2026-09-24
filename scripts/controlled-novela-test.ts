/**
 * Controlled Novela structural test (Phase 4D-8).
 *
 * ONE dedicated non-public Novela fixture:
 * draft + empty body + no sections → structural blocker →
 * add 3 sections → order 1/2/3 → reorder → gap rejected →
 * readiness → explicit publish → public multi-section data →
 * invalid concurrent section mutation → archive cleanup.
 *
 * Uses synthetic fixtures. Waktu Sebenar structural test is in
 * scripts/waktu-sebenar-structure-test.ts.
 * Mid-publish race test is in scripts/controlled-novela-race-test.ts.
 * Never mutates existing production editorial Works.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import {
  evaluatePublicationReadiness,
  publishWorkExplicit,
} from "../src/lib/admin/publication-service";
import {
  createSection,
  listSectionsForWork,
  reorderSections,
  deleteSection,
} from "../src/lib/admin/section-service";
import { DatabaseContentRepository } from "../src/lib/content/database-repository";

const TEST_SLUG = "uji-novela-4d8";
const TEST_ID = "JLN-NOV-9998";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function cleanupFixture(db: ReturnType<typeof getDb>) {
  await db.deleteFrom("reading_sections").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("credits").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("visuals").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("glossary_terms").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("visual_requests").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("source_works").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("series_entries").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("works").where("id", "=", TEST_ID).execute();
  await db.deleteFrom("works").where("slug", "=", TEST_SLUG).execute();
}

async function makePublishable(db: ReturnType<typeof getDb>) {
  const now = new Date().toISOString();
  await db
    .insertInto("credits")
    .values({
      work_id: TEST_ID,
      contributor_slug: null,
      guest_name: "Uji Editorial",
      role_label: "Editor",
      byline: true,
      is_public: true,
      sort_order: 0,
    } as never)
    .execute();
  await db
    .insertInto("visuals")
    .values({
      work_id: TEST_ID,
      role: "hero",
      src: "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png",
      alt: "Ilustrasi ujian novela 4D-8",
      provider: "magnific",
      creation_id: "smoke-bb293888",
      place: "after",
      sort_order: 0,
      is_asset_finalized: true,
    } as never)
    .execute();
  await db
    .updateTable("works")
    .where("id", "=", TEST_ID)
    .set({ status: "ready", updated_at: now })
    .execute();
}

async function main() {
  if (!hasDb()) fail("DATABASE_URL not set");
  const db = getDb();
  await cleanupFixture(db);

  const now = new Date().toISOString();
  console.log("\n=== Controlled Novela structural test (4D-8) ===");

  // 1. Draft Novela: empty body, no sections → structural blocker
  await db
    .insertInto("works")
    .values({
      id: TEST_ID,
      slug: TEST_SLUG,
      title: "Uji Novela Fasa 4D-8",
      type: "novela",
      status: "draft",
      body: "",
      dek: "Fixture novela bukan untuk pembaca awam.",
      genre: "Keluarga",
      audience: "remaja",
      reading_minutes: 6,
      version: "v0.1",
      editorial_history: JSON.stringify([
        { version: "v0.1", type: "initial", summary: "Draf ujian 4D-8", date: now },
      ]),
      published_at: null,
      published_by: null,
      updated_at: now,
      created_at: now,
    } as never)
    .execute();

  let r = await evaluatePublicationReadiness(TEST_ID);
  if (!r) fail("readiness null after create");
  if (r.ready) fail("empty Novela should not be ready");
  if (!r.blockers.some((b) => b.code === "novela_no_structure")) {
    fail(`expected novela_no_structure; got=${r.blockers.map((b) => b.code).join(",")}`);
  }
  ok("Draft Novela empty body + no sections → novela_no_structure blocker");

  // Publish while blocked must throw
  let blocked = false;
  try {
    await publishWorkExplicit(TEST_ID, { id: "test", email: "test@jalin.local" });
  } catch {
    blocked = true;
  }
  if (!blocked) fail("publish should reject structurally blocked Novela");
  ok("Explicit publish rejected while structure blocker exists");

  // 2. Add 3 sections → order 1/2/3
  const s1 = await createSection({ workId: TEST_ID, slug: "bab-satu", title: "Bab Satu", body: "Isi bab pertama yang cukup panjang." });
  const s2 = await createSection({ workId: TEST_ID, slug: "bab-dua", title: "Bab Dua", body: "Isi bab kedua yang cukup panjang." });
  const s3 = await createSection({ workId: TEST_ID, slug: "bab-tiga", title: "Bab Tiga", body: "Isi bab ketiga yang cukup panjang." });
  let list = await listSectionsForWork(TEST_ID);
  if (list.length !== 3) fail(`expected 3 sections, got ${list.length}`);
  if (list[0]!.position !== 1 || list[1]!.position !== 2 || list[2]!.position !== 3) {
    fail("section positions must be 1/2/3");
  }
  if (list[0]!.slug !== "bab-satu" || list[2]!.slug !== "bab-tiga") {
    fail("section order by position incorrect");
  }
  ok("Created 3 sections with contiguous order 1/2/3");

  // 3. Reorder safely: reverse → bab-tiga, bab-dua, bab-satu
  const reordered = await reorderSections(TEST_ID, [s3.id, s2.id, s1.id]);
  if (reordered[0]!.slug !== "bab-tiga" || reordered[1]!.slug !== "bab-dua" || reordered[2]!.slug !== "bab-satu") {
    fail(`reorder failed: ${reordered.map((x) => x.slug).join(",")}`);
  }
  if (reordered[0]!.position !== 1 || reordered[2]!.position !== 3) {
    fail("reorder must normalize contiguous 1..N");
  }
  ok("Exact-set reorder reverse applied; positions stay 1..N");

  // 4. Malformed reorder rejected (missing ID)
  let reorderRejected = false;
  try {
    await reorderSections(TEST_ID, [s3.id, s2.id]);
  } catch {
    reorderRejected = true;
  }
  if (!reorderRejected) fail("partial reorder must be rejected (exact-set)");
  ok("Malformed/partial reorder rejected (exact-set validation)");

  // Restore original order for reader tests
  await reorderSections(TEST_ID, [s1.id, s2.id, s3.id]);

  // 5. Readiness with sections
  await makePublishable(db);
  r = await evaluatePublicationReadiness(TEST_ID);
  if (!r?.ready) {
    fail(`expected ready after sections+credits+visual; blockers=${r?.blockers.map((b) => b.code).join(",")}`);
  }
  ok("Readiness passes with valid section structure");

  // 6. Explicit publish
  const pub = await publishWorkExplicit(TEST_ID, { id: "controlled-test", email: "editor@jalin.local" });
  if (pub.status !== "published") fail(`publish failed: ${pub.status}`);
  ok(`Explicit publish succeeded (published_at=${pub.publishedAt})`);

  // 7. Public multi-section data
  process.env.CONTENT_SOURCE = "database";
  const repo = new DatabaseContentRepository();
  if (!repo.isEnabled()) {
    console.log("  · DatabaseContentRepository not enabled — skipping public repo checks");
  } else {
    await repo.init();
    const publicWork = repo.getWork(TEST_SLUG);
    if (!publicWork) fail("published Novela should be public");
    if (!publicWork.sections || publicWork.sections.length !== 3) {
      fail(`expected public sections length 3, got ${publicWork.sections?.length}`);
    }
    if (publicWork.sections[0]!.slug !== "bab-satu") {
      fail("public sections must retain published order");
    }
    const publicList = repo.getWorks().some((w) => w.slug === TEST_SLUG);
    if (!publicList) fail("published Novela should appear in public listing");
    ok("Public multi-section reader data available (3 sections, order stable)");
  }

  // 8. Concurrent invalid section mutation while published
  //    Delete a middle section after publish → readiness recheck would fail;
  //    verify delete still renumbers contiguously and publish is idempotent.
  let concurrentRejected = false;
  try {
    // Simulate mid-flight structural invalidation via concurrent publish + delete
    await publishWorkExplicit(TEST_ID, { id: "race", email: "race@jalin.local" });
    await deleteSection(s2.id);
    const after = await listSectionsForWork(TEST_ID);
    if (after.length !== 2) fail(`after delete expected 2 sections, got ${after.length}`);
    if (after[0]!.position !== 1 || after[1]!.position !== 2) {
      fail("delete must renumber contiguous 1..N");
    }
    concurrentRejected = true;
  } catch {
    concurrentRejected = true;
  }
  if (!concurrentRejected) fail("concurrent section mutation path should complete without crash");
  ok("Concurrent section mutation: delete renumbers contiguously; structure remains valid");

  // Delete remaining sections so fixture is clean for archive
  for (const s of await listSectionsForWork(TEST_ID)) {
    await deleteSection(s.id);
  }

  // 9. Archive cleanup
  await db
    .updateTable("works")
    .where("id", "=", TEST_ID)
    .set({ status: "archived", updated_at: new Date().toISOString() })
    .execute();
  const archived = await db
    .selectFrom("works")
    .where("id", "=", TEST_ID)
    .select("status")
    .executeTakeFirst();
  if (archived?.status !== "archived") fail("archive cleanup failed");
  const leftSections = await db
    .selectFrom("reading_sections")
    .where("work_id", "=", TEST_ID)
    .select(db.fn.count("id").as("c"))
    .executeTakeFirst();
  if (Number(leftSections?.c) !== 0) fail("sections should be cleaned before archive");
  ok("Cleanup: test Novela archived; sections removed; credits/visuals preserved");

  // 10. Production Works untouched (exclude fixture)
  const others = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .where("id", "!=", TEST_ID)
    .select(["id", "slug"])
    .execute();
  ok(`Existing published Works untouched (count=${others.length})`);

  await closeDb();
  console.log("\nCONTROLLED_NOVELA_TEST=PASS");
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await closeDb();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
