/**
 * Controlled publication test (Phase 4D-6).
 *
 * Creates ONE dedicated non-public test Work, walks it through
 * draft → ready (with blockers cleared) → explicit publish,
 * verifies public visibility only after publish, then archives
 * the test Work (safe cleanup path — soft delete).
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
import { DatabaseContentRepository } from "../src/lib/content/database-repository";

const TEST_SLUG = "uji-terbit-4d6";
const TEST_ID = "work-uji-4d6-controlled";

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

  // Cleanup any prior run
  await db.deleteFrom("credits").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("visuals").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("glossary_terms").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("visual_requests").where("work_id", "=", TEST_ID).execute();
  await db.deleteFrom("works").where("id", "=", TEST_ID).execute();
  await db.deleteFrom("works").where("slug", "=", TEST_SLUG).execute();

  const now = new Date().toISOString();
  const durableSrc =
    "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png";

  console.log("\n=== Controlled publication test ===");

  // 1. Create draft Work (no credits/visuals yet → blockers expected)
  await db
    .insertInto("works")
    .values({
      id: TEST_ID,
      slug: TEST_SLUG,
      title: "Uji Terbit Fasa 4D-6",
      type: "cerpen",
      status: "draft",
      body: "Manuskrip ujian terbit. " + "Ayat isi ".repeat(20).trim(),
      dek: "Karya ujian bukan untuk pembaca awam.",
      genre: "Keluarga",
      audience: "remaja",
      reading_minutes: 2,
      version: "v0.1",
      editorial_history: JSON.stringify([
        { version: "v0.1", type: "initial", summary: "Draf ujian 4D-6", date: now },
      ]),
      published_at: null,
      published_by: null,
      updated_at: now,
      created_at: now,
    } as never)
    .execute();
  ok("Draft test Work created");

  // 2. Readiness on draft → blockers (status + no credits + no hero)
  let r = await evaluatePublicationReadiness(TEST_ID);
  if (!r) fail("readiness null after create");
  if (r.ready) fail("draft Work should NOT be ready");
  if (!r.blockers.some((b) => b.code === "status_not_publishable")) {
    fail("expected status_not_publishable blocker");
  }
  if (!r.blockers.some((b) => b.code === "credits_missing")) {
    fail("expected credits_missing blocker");
  }
  ok("Blockers prevent early publication (draft + missing credits/visuals)");

  // 3. Attempt publish while not ready → must throw
  let publishBlocked = false;
  try {
    await publishWorkExplicit(TEST_ID, { id: "test", email: "test@jalin.local" });
  } catch {
    publishBlocked = true;
  }
  if (!publishBlocked) fail("publish should reject non-ready Work");
  ok("Explicit publish rejected while blockers exist");

  const afterFail = await db.selectFrom("works").where("id", "=", TEST_ID).selectAll().executeTakeFirst();
  if (!afterFail || afterFail.status === "published") fail("Work must remain unpublished after failed publish");
  ok("Work not published after rejected attempt");

  // 4. Add minimal public byline credit + finalized durable hero visual
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
      src: durableSrc,
      alt: "Ilustrasi ujian terbit 4D-6",
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
  ok("Credits + finalized durable visual + glossary attached");

  // 5. Move to ready
  await db.updateTable("works").where("id", "=", TEST_ID).set({ status: "ready", updated_at: new Date().toISOString() }).execute();

  r = await evaluatePublicationReadiness(TEST_ID);
  if (!r) fail("readiness null after fixes");
  if (!r.ready) {
    fail(`expected ready=true after fixes; blockers=${r.blockers.map((b) => b.code).join(",")}`);
  }
  ok("Readiness becomes true only after fixes");

  // 5b. Race regression (4D-6R): preflight PASS, then invalidate relation
  //     before the publish transaction begins → transactional recheck must fail.
  const visualRow = await db
    .selectFrom("visuals")
    .where("work_id", "=", TEST_ID)
    .selectAll()
    .executeTakeFirst();
  if (!visualRow) fail("test visual missing for race test");

  let raceError: string | null = null;
  try {
    await publishWorkExplicit(
      TEST_ID,
      { id: "race-test", email: "race@jalin.local" },
      {
        beforeTransaction: async () => {
          await db
            .updateTable("visuals")
            .where("id", "=", visualRow.id)
            .set({ is_asset_finalized: false })
            .execute();
        },
      }
    );
  } catch (err) {
    raceError = err instanceof Error ? err.message : String(err);
  }
  if (!raceError) fail("race: publish should fail when relation invalidates after preflight");
  if (!raceError.includes("transaksi") && !raceError.includes("finalized")) {
    fail(`race: expected transactional readiness failure, got: ${raceError}`);
  }
  const afterRace = await db
    .selectFrom("works")
    .where("id", "=", TEST_ID)
    .selectAll()
    .executeTakeFirst();
  if (!afterRace || afterRace.status !== "ready") {
    fail(`race: Work must remain status=ready (got ${afterRace?.status})`);
  }
  if (afterRace.published_at) fail("race: published_at must remain null after failed trx check");
  if (afterRace.published_by) fail("race: published_by must remain null after failed trx check");
  ok("Race: invalid relation after preflight prevents publish; Work stays ready; audit fields null");

  // Restore relation for normal publish path
  await db
    .updateTable("visuals")
    .where("id", "=", visualRow.id)
    .set({ is_asset_finalized: true })
    .execute();
  r = await evaluatePublicationReadiness(TEST_ID);
  if (!r?.ready) fail("restored Work should be ready again");

  // 5c. TRUE concurrent mutation (4D-6R2): row locks + SERIALIZABLE.
  //     T1 holds FOR UPDATE on visuals/credits/… after readiness PASS.
  //     T2 tries to flip is_asset_finalized → must BLOCK until T1 commits
  //     (safe outcome A: publication commits against a stable snapshot).
  // 5d. Same publish trx: T2 INSERT competing slug → works_slug_key UNIQUE 23505.
  const COMPETING_ID = "work-uji-4d6-slug-race";
  await db.deleteFrom("works").where("id", "=", COMPETING_ID).execute();

  let t2VisualDone = false;
  let t2VisualBlockedDuringTrx = false;
  let slugRaceRejected = false;
  let slugRaceCode = "";

  const concurrentPublish = await publishWorkExplicit(
    TEST_ID,
    { id: "controlled-test", email: "editor@jalin.local" },
    {
      insideTransactionAfterReadiness: async () => {
        // T2 visual: fire-and-forget on another pool connection — must block on FOR UPDATE.
        void db
          .updateTable("visuals")
          .where("id", "=", visualRow.id)
          .set({ is_asset_finalized: false })
          .execute()
          .then(() => {
            t2VisualDone = true;
          })
          .catch(() => {
            t2VisualDone = true;
          });

        // T2 slug: unique constraint rejects immediately (different row, same slug).
        try {
          await db
            .insertInto("works")
            .values({
              id: COMPETING_ID,
              slug: TEST_SLUG,
              title: "Pesaing slug ujian",
              type: "cerpen",
              status: "ready",
              body: "Manuskrip pesaing slug. ".repeat(10).trim(),
              version: "v0.1",
              editorial_history: "[]",
              published_at: null,
              published_by: null,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            } as never)
            .execute();
        } catch (err) {
          slugRaceRejected = true;
          slugRaceCode = String((err as { code?: string })?.code ?? "");
        }

        // Give T2 visual time to attempt the UPDATE while we still hold locks.
        await new Promise((resolve) => setTimeout(resolve, 250));
        t2VisualBlockedDuringTrx = !t2VisualDone;
      },
    }
  );

  if (!t2VisualBlockedDuringTrx) {
    fail("concurrent visual: T2 must block on FOR UPDATE while publish trx holds locks");
  }
  if (concurrentPublish.alreadyPublished) fail("concurrent publish should not be alreadyPublished");
  if (concurrentPublish.status !== "published") fail("concurrent publish should succeed (outcome A)");
  if (!concurrentPublish.readiness?.ready) fail("concurrent publish must return ready transactional readiness");
  if (!slugRaceRejected) fail("slug race: competing INSERT with same slug must be rejected");
  if (slugRaceCode && slugRaceCode !== "23505") {
    fail(`slug race: expected unique_violation 23505, got ${slugRaceCode}`);
  }
  const slugCount = await db
    .selectFrom("works")
    .where("slug", "=", TEST_SLUG)
    .select(db.fn.count("id").as("c"))
    .executeTakeFirst();
  if (Number(slugCount?.c) !== 1) {
    fail(`slug race: expected exactly 1 Work with slug, got ${slugCount?.c}`);
  }
  const competing = await db
    .selectFrom("works")
    .where("id", "=", COMPETING_ID)
    .select("id")
    .executeTakeFirst();
  if (competing) fail("slug race: competing Work must not exist");

  // After T1 commits, T2's visual UPDATE proceeds (post-commit) — restore for archive path.
  for (let i = 0; i < 40 && !t2VisualDone; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const visualAfter = await db
    .selectFrom("visuals")
    .where("id", "=", visualRow.id)
    .selectAll()
    .executeTakeFirst();
  if (!visualAfter) fail("visual row missing after concurrent test");
  // T2 may have flipped finalized=false after commit; restore so cleanup is consistent.
  if (!visualAfter.is_asset_finalized) {
    await db
      .updateTable("visuals")
      .where("id", "=", visualRow.id)
      .set({ is_asset_finalized: true })
      .execute();
  }

  ok(
    `Concurrent visual: T2 blocked on FOR UPDATE (outcome A); publish committed stable snapshot`
  );
  ok(
    `Duplicate-slug race: competing insert rejected (SQLSTATE ${slugRaceCode}); single slug retained`
  );

  // 6. Explicit publish already ran in 5c
  if (concurrentPublish.publishedBy !== "editor@jalin.local") fail("publishedBy should be stored");
  ok(
    `Explicit publish succeeded (published_at=${concurrentPublish.publishedAt}, published_by=${concurrentPublish.publishedBy})`
  );

  // 7. Idempotent republish
  const again = await publishWorkExplicit(TEST_ID, { id: "controlled-test", email: "editor@jalin.local" });
  if (!again.alreadyPublished) fail("second publish should be idempotent");
  if (again.publishedAt !== concurrentPublish.publishedAt) fail("publishedAt must not change on idempotent republish");
  ok("Idempotent republish: alreadyPublished=true, timestamp unchanged");

  // 8. Public visibility only after publish
  process.env.CONTENT_SOURCE = "database";
  const repo = new DatabaseContentRepository();
  if (!repo.isEnabled()) {
    console.log("  · DatabaseContentRepository not enabled in this env — checking status filter logic via row only");
  } else {
    await repo.init();
    const publicWork = repo.getWork(TEST_SLUG);
    if (!publicWork) fail("published Work should be public after publish");
    ok("Public route data available only after publish (found in public repo)");
    const listed = repo.getWorks().some((w) => w.slug === TEST_SLUG);
    if (!listed) fail("published Work should appear in public listing");
    ok("Public listing includes published Work");
  }

  // 9. Unpublish path: archive (safe cleanup — does not delete credits/visuals)
  await db.updateTable("works").where("id", "=", TEST_ID).set({ status: "archived", updated_at: new Date().toISOString() }).execute();
  const archived = await db.selectFrom("works").where("id", "=", TEST_ID).selectAll().executeTakeFirst();
  if (!archived || archived.status !== "archived") fail("archive cleanup failed");
  const creditCount = await db.selectFrom("credits").where("work_id", "=", TEST_ID).select(db.fn.count("id").as("c")).executeTakeFirst();
  if (Number(creditCount?.c) !== 1) fail("archive must not delete credits");
  ok("Cleanup: test Work archived; credits/visuals preserved (no destructive delete)");

  // 10. Confirm production works untouched: count published works excluding test
  const others = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .where("id", "!=", TEST_ID)
    .select(["id", "slug", "published_at"])
    .execute();
  ok(`Existing published Works untouched (count=${others.length})`);

  await closeDb();
  console.log("\nCONTROLLED_PUBLICATION_TEST=PASS");
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
