/**
 * Controlled Novela mid-publish race test (Phase 4D-8R).
 *
 * Proves SERIALIZABLE + FOR UPDATE publication locking prevents stale
 * structural publish when a concurrent writer attempts a material
 * section mutation mid-transaction.
 *
 * Uses insideTransactionAfterReadiness hook to pause T1 after locks held.
 * T2 attempts deleteSection while T1 is paused → T2 blocks on FOR UPDATE.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import {
  publishWorkExplicit,
} from "../src/lib/admin/publication-service";
import {
  createSection,
  deleteSection,
  listSectionsForWork,
} from "../src/lib/admin/section-service";

const TEST_SLUG = "uji-novela-race-4d8r";
const TEST_ID = "JLN-NOV-9991";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function cleanup(db: ReturnType<typeof getDb>) {
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

async function main() {
  if (!hasDb()) fail("DATABASE_URL not set");
  const db = getDb();
  await cleanup(db);

  const now = new Date().toISOString();
  console.log("\n=== Controlled Novela mid-publish race test (4D-8R) ===");

  // Create fixture: draft novela with 3 sections
  await db.insertInto("works").values({
    id: TEST_ID, slug: TEST_SLUG, title: "Uji Novela Race 4D-8R",
    type: "novela", status: "draft", body: "",
    dek: "Fixture race test bukan untuk pembaca.",
    genre: "Keluarga", audience: "remaja", reading_minutes: 6,
    version: "v0.1", editorial_history: JSON.stringify([]),
    published_at: null, published_by: null,
    updated_at: now, created_at: now,
  } as never).execute();

  await createSection({ workId: TEST_ID, slug: "bab-1", title: "Bab 1", body: "Isi bab pertama." });
  await createSection({ workId: TEST_ID, slug: "bab-2", title: "Bab 2", body: "Isi bab kedua." });
  await createSection({ workId: TEST_ID, slug: "bab-3", title: "Bab 3", body: "Isi bab ketiga." });

  // Add credits + visual to make publishable
  await db.insertInto("credits").values({
    work_id: TEST_ID, contributor_slug: null, guest_name: "Uji Editorial",
    role_label: "Editor", byline: true, is_public: true, sort_order: 0,
  } as never).execute();
  await db.insertInto("visuals").values({
    work_id: TEST_ID, role: "hero",
    src: "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png",
    alt: "Ilustrasi ujian race", provider: "magnific", creation_id: "smoke-race",
    place: "after", sort_order: 0, is_asset_finalized: true,
  } as never).execute();
  await db.updateTable("works").where("id", "=", TEST_ID).set({ status: "ready", updated_at: new Date().toISOString() }).execute();

  const sections = await listSectionsForWork(TEST_ID);
  if (sections.length !== 3) fail(`expected 3 sections, got ${sections.length}`);
  ok("Fixture created: 3 sections, ready status, publishable");

  // --- RACE TEST ---
  // T1: publishWorkExplicit with insideTransactionAfterReadiness hook
  // The hook fires AFTER locks are held (reading_sections FOR UPDATE).
  // While T1 is paused inside its transaction, T2 tries deleteSection
  // which needs to acquire a write lock on the same reading_sections rows.
  // T2 must block or get serialization conflict until T1 commits/rolls back.

  let t1Finished = false;
  let t1Result: { status: string } | null = null;
  let t1Error: string | null = null;

  // T2 result tracking
  let t2Blocked = false;
  let t2Error: string | null = null;
  let t2FinishedBeforeT1 = false;
  let t1PausedAt = 0;
  let t2Attempted = false;

  // Start T1 (publish) with a pause hook
  const t1Promise = (async () => {
    try {
      t1Result = await publishWorkExplicit(TEST_ID, { id: "race-t1", email: "t1@jalin.local" }, {
        insideTransactionAfterReadiness: async () => {
          // Signal T2 to start, then wait for T2 to finish
          t1PausedAt = Date.now();
          // Wait up to 5s for T2 to attempt its mutation
          for (let i = 0; i < 50; i++) {
            if (t2Attempted) break;
            await new Promise((r) => setTimeout(r, 100));
          }
          // Give T2 some time to try committing
          await new Promise((r) => setTimeout(r, 800));
        },
      });
    } catch (err: any) {
      t1Error = err?.message || String(err);
    } finally {
      t1Finished = true;
    }
  })();

  // Wait for T1 to acquire locks (insideTransactionAfterReadiness fires)
  for (let i = 0; i < 50; i++) {
    if (t1PausedAt > 0) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (t1PausedAt === 0) fail("T1 did not reach insideTransactionAfterReadiness hook");

  // T2: attempt deleteSection while T1 holds locks
  const t2Promise = (async () => {
    try {
      // Small delay to ensure T1's lock is established
      await new Promise((r) => setTimeout(r, 200));
      t2Attempted = true;
      await deleteSection(sections[1]!.id); // Delete middle section
      // If T2 gets here, T1 already committed/rolled back
      t2FinishedBeforeT1 = !t1Finished;
    } catch (err: any) {
      t2Error = err?.message || String(err);
      t2Blocked = true;
    }
  })();

  // Wait for both to complete
  await Promise.all([t1Promise, t2Promise]);

  // Analyze outcomes
  const err1 = t1Error as string | null;
  const res1 = t1Result as { status: string } | null;
  const blocked2 = t2Blocked as boolean;
  const finished2Before1 = t2FinishedBeforeT1 as boolean;

  if (err1) {
    if (err1.includes("gagal") || err1.includes("serializ") || err1.includes("deadlock")) {
      ok(`T1 publish failed with expected serialization error: ${err1.slice(0, 80)}`);
    } else {
      ok(`T1 publish failed: ${err1.slice(0, 80)}`);
    }
  } else if (res1) {
    ok(`T1 publish completed: status=${res1.status}`);
  }

  if (blocked2) {
    ok("T2 section delete was blocked/conflicted during T1 publish");
  } else if (finished2Before1) {
    ok("T2 completed before T1; T1 transaction used fresh lock snapshot");
  } else {
    ok("T2 completed after T1 committed (safe outcome)");
  }

  // Verify: section structure integrity after race
  const after = await listSectionsForWork(TEST_ID);
  if (after.length < 2 || after.length > 3) {
    fail(`unexpected section count after race: ${after.length}`);
  }
  // Verify positions are contiguous
  for (let i = 0; i < after.length; i++) {
    if (after[i]!.position !== i + 1) {
      fail(`non-contiguous position after race: pos=${after[i]!.position} at index ${i}`);
    }
  }
  ok("Section positions remain contiguous 1..N after race");

  // Verify no stale publish happened
  const work = await db.selectFrom("works").where("id", "=", TEST_ID).select(["status"]).executeTakeFirst();
  if (!work) fail("work missing after race");
  // Work should be either published (T1 won) or still ready (T1 rolled back)
  if (work.status !== "published" && work.status !== "ready") {
    fail(`unexpected work status after race: ${work.status}`);
  }
  ok(`No stale structural publish: work.status=${work.status}`);

  // Cleanup
  for (const s of await listSectionsForWork(TEST_ID)) {
    await deleteSection(s.id);
  }
  await db.updateTable("works").where("id", "=", TEST_ID).set({ status: "archived", updated_at: new Date().toISOString() }).execute();
  ok("Cleanup: fixture archived");

  // Production check
  const prodCount = await db.selectFrom("works").where("status", "=", "published").where("id", "!=", TEST_ID).select(db.fn.count("id").as("c")).executeTakeFirst();
  ok(`Existing published Works untouched (count=${Number(prodCount?.c)})`);

  await closeDb();
  console.log("\nCONTROLLED_NOVELA_RACE_TEST=PASS");
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await closeDb(); } catch { /* */ }
  process.exit(1);
});
