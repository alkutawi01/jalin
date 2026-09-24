/**
 * Controlled derivative source-rights test (Phase 4D-7).
 *
 * Creates ONE dedicated non-public terjemahan Work, walks provenance →
 * rights review → readiness, verifies rights gate blocks/pass, stale
 * invalidation, and public serializer safety. Archives the test Work.
 *
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
  getSourceRightsView,
  performRightsReview,
  upsertSourceProvenance,
  toPublicSourceProvenance,
} from "../src/lib/admin/source-rights";

const TEST_SLUG = "uji-hak-4d7";
const TEST_ID = "JLN-TER-9997";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function main() {
  if (!hasDb()) fail("DATABASE_URL not set");
  const db = getDb();

  // Cleanup any prior run (source_works cascades from works delete)
  await db.deleteFrom("credits").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("visuals").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("glossary_terms").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("visual_requests").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("source_works").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("works").where("id", "=", TEST_ID).execute();
  await db.deleteFrom("works").where("slug", "=", TEST_SLUG).execute();

  const now = new Date().toISOString();
  const durableSrc =
    "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png";

  console.log("\n=== Controlled derivative source-rights test (4D-7) ===");

  // 1. Create draft terjemahan Work
  await db
    .insertInto("works")
    .values({
      id: TEST_ID,
      slug: TEST_SLUG,
      title: "Uji Hak Sumber 4D-7",
      type: "terjemahan",
      status: "draft",
      body: "Manuskrip terjemahan ujian. " + "Ayat isi ".repeat(20).trim(),
      dek: "Karya ujian bukan untuk pembaca awam.",
      genre: "Keluarga",
      audience: "remaja",
      reading_minutes: 2,
      version: "v0.1",
      editorial_history: JSON.stringify([
        { version: "v0.1", type: "initial", summary: "Draf ujian 4D-7", date: now },
      ]),
      published_at: null,
      published_by: null,
      updated_at: now,
      created_at: now,
    } as never)
    .execute();
  ok("Draft terjemahan Work created");

  // 2. Credits + visual + glossary so only rights gate can block
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
      role: "section",
      src: durableSrc,
      alt: "Ilustrasi ujian hak 4D-7",
      provider: "magnific",
      creation_id: "smoke-bb293888",
      place: "after",
      sort_order: 0,
      is_asset_finalized: true,
    } as never)
    .execute();
  await db
    .insertInto("glossary_terms")
    .values({
      work_id: TEST_ID,
      term: "ujian",
      meaning: "percubaan",
      source: "Kamus Dewan",
      sort_order: 0,
    } as never)
    .execute();
  await db
    .updateTable("works")
    .where("id", "=", TEST_ID)
    .set({ status: "ready", updated_at: new Date().toISOString() })
    .execute();
  ok("Credits + visual + glossary + status=ready");

  // 3. Readiness without source → rights source_missing blocker
  let r = await evaluatePublicationReadiness(TEST_ID);
  if (!r) fail("readiness null");
  if (r.ready) fail("should NOT be ready without source_works");
  if (!r.blockers.some((b) => b.code === "source_missing")) {
    fail(`expected source_missing, got: ${r.blockers.map((b) => b.code).join(",")}`);
  }
  ok("Rights gate blocks derivative without source_works");

  // 4. Publish attempt must fail
  let publishBlocked = false;
  try {
    await publishWorkExplicit(TEST_ID, { id: "test", email: "test@jalin.local" });
  } catch {
    publishBlocked = true;
  }
  if (!publishBlocked) fail("publish should reject missing rights");
  ok("Explicit publish rejected while rights gate fails");

  // 5. Upsert incomplete provenance → still blocked
  const up1 = await upsertSourceProvenance(
    TEST_ID,
    {
      originalTitle: "",
      author: "",
      originalLanguage: "",
      sourceUrl: "https://example.org/sumber",
    },
    { id: "admin", email: "editor@jalin.local" }
  );
  if (up1.view.isDerivative !== true) fail("view.isDerivative should be true");
  r = await evaluatePublicationReadiness(TEST_ID);
  if (!r?.blockers.some((b) => b.code === "source_incomplete")) {
    fail(`expected source_incomplete after partial upsert`);
  }
  ok("Incomplete provenance still blocked");

  // 6. Complete provenance + PASS review with server stamps
  const up2 = await upsertSourceProvenance(
    TEST_ID,
    {
      originalTitle: "Hikayat Uji",
      author: "Siti Aminah",
      originalLanguage: "Melayu Klasik",
      publicationYear: 1957,
      sourceEdition: "Cetakan 1957",
      sourceUrl: "https://example.org/hikayat",
      sourceLocator: "ms. 12",
      sourceTextBasis: "Teks asal 1957 (domain awam)",
    },
    { id: "admin", email: "editor@jalin.local" }
  );
  if (up2.view.sourceWork?.originalTitle !== "Hikayat Uji") fail("provenance not saved");
  ok("Complete provenance saved");

  // PASS review
  const review = await performRightsReview(
    TEST_ID,
    {
      rights_status: "public_domain",
      rights_notes: "Domain awam disahkan melalui katalog perpustakaan.",
      rights_evidence: "Katalog PNM 1957, no. 1234",
    },
    { id: "admin", email: "rights@jalin.local" }
  );
  if (review.view.sourceWork?.reviewedBy !== "rights@jalin.local") {
    fail(`reviewed_by must be server session (got ${review.view.sourceWork?.reviewedBy})`);
  }
  if (!review.view.sourceWork?.reviewedAt) fail("reviewed_at must be set server-side");
  ok("Rights PASS review recorded with server-side reviewed_by/at");

  // 7. Rights gate now passes
  r = await evaluatePublicationReadiness(TEST_ID);
  if (!r) fail("readiness null after review");
  if (!r.gates.rights.pass) {
    fail(`rights gate should pass; blockers=${r.gates.rights.blockers.map((b) => b.code).join(",")}`);
  }
  if (!r.ready) fail(`overall ready expected; blockers=${r.blockers.map((b) => b.code).join(",")}`);
  ok("Rights gate + overall readiness PASS after human review");

  // 8. Stale approval: edit material field → invalidate
  const up3 = await upsertSourceProvenance(
    TEST_ID,
    {
      originalTitle: "Hikayat Uji (edisi baharu)",
    },
    { id: "admin", email: "editor@jalin.local" }
  );
  if (!up3.invalidatedApproval) fail("material edit after PASS must invalidate approval");
  if (up3.view.sourceWork?.rightsStatus !== "needs_review") {
    fail(`status should reset to needs_review (got ${up3.view.sourceWork?.rightsStatus})`);
  }
  if (up3.view.sourceWork?.reviewedBy) fail("reviewed_by must clear on invalidation");
  if (up3.view.sourceWork?.reviewedAt) fail("reviewed_at must clear on invalidation");
  r = await evaluatePublicationReadiness(TEST_ID);
  if (r?.gates.rights.pass) fail("rights must fail after stale invalidation");
  if (!r?.blockers.some((b) => b.code === "rights_not_approved")) {
    fail("expected rights_not_approved after invalidation");
  }
  ok("Material provenance change invalidates PASS → needs_review + rights blocked");

  // 9. Re-approve and publish for real
  await performRightsReview(
    TEST_ID,
    {
      rights_status: "public_domain",
      rights_notes: "Domain awam disahkan semula selepas kemas kini provenance.",
    },
    { id: "admin", email: "rights@jalin.local" }
  );
  r = await evaluatePublicationReadiness(TEST_ID);
  if (!r?.ready) fail(`ready expected before publish; blockers=${r?.blockers.map((b) => b.code).join(",")}`);

  // 9b. Concurrent rights mutation: T2 UPDATE source_works must block on FOR UPDATE
  //     while publish trx holds locks (safe outcome A — stable snapshot publish).
  let t2RightsDone = false;
  let t2RightsBlockedDuringTrx = false;

  const concurrentPublished = await publishWorkExplicit(
    TEST_ID,
    { id: "controlled-test", email: "editor@jalin.local" },
    {
      insideTransactionAfterReadiness: async () => {
        void db
          .updateTable("source_works")
          .where("work_id", "=", TEST_ID)
          .set({
            rights_status: "restricted",
            rights_notes: "T2 concurrent mutation ujian 4D-7",
          })
          .execute()
          .then(() => {
            t2RightsDone = true;
          })
          .catch(() => {
            t2RightsDone = true;
          });
        await new Promise((resolve) => setTimeout(resolve, 250));
        t2RightsBlockedDuringTrx = !t2RightsDone;
      },
    }
  );

  if (!t2RightsBlockedDuringTrx) {
    fail("concurrent rights: T2 must block on FOR UPDATE while publish trx holds source_works lock");
  }
  if (concurrentPublished.status !== "published") {
    fail("concurrent rights publish should succeed (outcome A)");
  }
  if (!concurrentPublished.readiness?.ready) {
    fail("concurrent rights publish must return ready transactional readiness");
  }
  ok(
    `Concurrent rights mutation: T2 blocked on FOR UPDATE (outcome A); published_at=${concurrentPublished.publishedAt}`
  );

  // Let T2 finish post-commit, then restore PASS rights for a clean archived snapshot.
  for (let i = 0; i < 40 && !t2RightsDone; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const srcAfterRace = await db
    .selectFrom("source_works")
    .where("work_id", "=", TEST_ID)
    .selectAll()
    .executeTakeFirst();
  if (!srcAfterRace) fail("source_works missing after concurrent test");
  if (String(srcAfterRace.rights_status) === "restricted") {
    await db
      .updateTable("source_works")
      .where("work_id", "=", TEST_ID)
      .set({
        rights_status: "public_domain",
        rights_notes: "Dipulihkan selepas ujian keconcangan hak.",
      })
      .execute();
  }

  // 10. Public serializer: no internal field leaks
  const view = await getSourceRightsView(TEST_ID);
  if (!view?.sourceWork) fail("source view missing after publish");
  const publicRow = {
    original_title: view.sourceWork!.originalTitle,
    author: view.sourceWork!.author,
    original_language: view.sourceWork!.originalLanguage,
    publication_year: view.sourceWork!.publicationYear,
    source_edition: view.sourceWork!.sourceEdition,
    source_locator: view.sourceWork!.sourceLocator,
    rights_status: view.sourceWork!.rightsStatus,
  };
  const pub = toPublicSourceProvenance(publicRow);
  const pubJson = JSON.stringify(pub);
  for (const forbidden of [
    "rights_notes",
    "rights_evidence",
    "rights_history",
    "reviewed_by",
    "reviewed_at",
    "source_url",
    "approved_material_hash",
    "rights@jalin.local",
    "example.org",
  ]) {
    if (pubJson.toLowerCase().includes(forbidden.toLowerCase())) {
      fail(`public serializer leaked forbidden field/value: ${forbidden}`);
    }
  }
  if (pub?.rightsLabel !== "Domain awam") fail("rightsLabel should be Domain awam");
  ok("Public serializer strips all internal rights fields");

  // 11. Public repository maps safe sourceWork only
  process.env.CONTENT_SOURCE = "database";
  const { DatabaseContentRepository } = await import(
    "../src/lib/content/database-repository"
  );
  const repo = new DatabaseContentRepository();
  if (repo.isEnabled()) {
    await repo.init();
    const publicWork = repo.getWork(TEST_SLUG);
    if (!publicWork) fail("published derivative should be public");
    if (!publicWork.sourceWork?.title) fail("public Work should expose source title");
    const leak = JSON.stringify(publicWork.sourceWork);
    if (leak.includes("source_url") || leak.includes("reviewed_by") || leak.includes("rights_notes")) {
      fail(`public Work.sourceWork leaked internal fields: ${leak}`);
    }
    ok("Public repository sourceWork is reader-safe");
  } else {
    console.log("  · DatabaseContentRepository not enabled — skip public repo check");
  }

  // 12. Production works untouched
  const production = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .where("id", "not like", "JLN-TER-9997%")
    .where("id", "!=", TEST_ID)
    .select(["id", "slug"])
    .execute();
  const sourceForProduction = await db
    .selectFrom("source_works")
    .where(
      "work_id",
      "in",
      production.map((p) => p.id)
    )
    .select("work_id")
    .execute();
  if (sourceForProduction.length > 0) {
    fail(`production original Works must not gain invented source rows: ${sourceForProduction.map((s) => s.work_id).join(",")}`);
  }
  ok(`Production Works untouched (published=${production.length}, no invented source rows)`);

  // 13. Cleanup archive
  await db
    .updateTable("works")
    .where("id", "=", TEST_ID)
    .set({ status: "archived", updated_at: new Date().toISOString() })
    .execute();
  ok("Test Work archived (soft cleanup)");

  await closeDb();
  console.log("\nCONTROLLED_SOURCE_RIGHTS_TEST=PASS");
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
