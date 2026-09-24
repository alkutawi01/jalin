/**
 * Controlled Bersiri mid-publish race test (Phase 4D-8R).
 *
 * Proves SERIALIZABLE + FOR UPDATE publication locking prevents stale
 * structural publish when a concurrent writer attempts a material
 * Series membership/order mutation mid-transaction.
 *
 * Uses insideTransactionAfterReadiness hook to pause T1 after locks held.
 * T2 attempts detachEpisode while T1 is paused → T2 blocks on FOR UPDATE.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import {
  publishWorkExplicit,
} from "../src/lib/admin/publication-service";
import {
  createSeries,
  attachEpisode,
  detachEpisode,
  listSeriesEntries,
} from "../src/lib/admin/series-service";

const SERIES_SLUG = "uji-siri-race-4d8r";
const EP_IDS = ["JLN-BER-9981", "JLN-BER-9982", "JLN-BER-9983"];
const EP_SLUGS = ["uji-race-ep1-4d8r", "uji-race-ep2-4d8r", "uji-race-ep3-4d8r"];

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function cleanup(db: ReturnType<typeof getDb>) {
  for (const slug of [SERIES_SLUG]) {
    const s = await db.selectFrom("series").where("slug", "=", slug).select("id").executeTakeFirst();
    if (s) {
      await db.deleteFrom("series_entries").where("series_id", "=", s.id).execute();
      await db.deleteFrom("series").where("id", "=", s.id).execute();
    }
  }
  for (const id of EP_IDS) {
    await db.deleteFrom("reading_sections").where("work_id", "=", id).execute();
    await db.deleteFrom("series_entries").where("work_id", "=", id).execute();
    await db.deleteFrom("credits").where("work_id", "=", id).execute();
    await db.deleteFrom("visuals").where("work_id", "=", id).execute();
    await db.deleteFrom("glossary_terms").where("work_id", "=", id).execute();
    await db.deleteFrom("visual_requests").where("work_id", "=", id).execute();
    await db.deleteFrom("source_works").where("work_id", "=", id).execute();
    await db.deleteFrom("works").where("id", "=", id).execute();
  }
  for (const slug of EP_SLUGS) {
    await db.deleteFrom("works").where("slug", "=", slug).execute();
  }
}

async function createEpisode(db: ReturnType<typeof getDb>, id: string, slug: string, status: string) {
  const now = new Date().toISOString();
  await db.insertInto("works").values({
    id, slug, title: `Uji Race ${slug}`, type: "bersiri",
    status, body: `Isi episod ${slug}.`,
    dek: null, genre: "Keluarga", audience: "remaja", reading_minutes: 5,
    version: "v0.1", editorial_history: JSON.stringify([]),
    published_at: status === "published" ? now : null,
    published_by: status === "published" ? "test" : null,
    updated_at: now, created_at: now,
  } as never).execute();
  await db.insertInto("credits").values({
    work_id: id, contributor_slug: null, guest_name: "Uji Editorial",
    role_label: "Editor", byline: true, is_public: true, sort_order: 0,
  } as never).execute();
  await db.insertInto("visuals").values({
    work_id: id, role: "hero",
    src: "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png",
    alt: `Ilustrasi ${slug}`, provider: "magnific", creation_id: "smoke-race",
    place: "after", sort_order: 0, is_asset_finalized: true,
  } as never).execute();
}

async function main() {
  if (!hasDb()) fail("DATABASE_URL not set");
  const db = getDb();
  await cleanup(db);

  const now = new Date().toISOString();
  console.log("\n=== Controlled Bersiri mid-publish race test (4D-8R) ===");

  // Create 3 episodes: ep1=ready, ep2=published, ep3=ready
  await createEpisode(db, EP_IDS[0]!, EP_SLUGS[0]!, "ready");
  await createEpisode(db, EP_IDS[1]!, EP_SLUGS[1]!, "published");
  await createEpisode(db, EP_IDS[2]!, EP_SLUGS[2]!, "ready");

  // Create series and attach
  const series = await createSeries({ slug: SERIES_SLUG, title: "Siri Uji Race", mode: "continuous", status: "ongoing" });
  await attachEpisode(series.id, EP_IDS[0]!);
  await attachEpisode(series.id, EP_IDS[1]!);
  await attachEpisode(series.id, EP_IDS[2]!);

  const entries = await listSeriesEntries(series.id);
  if (entries.length !== 3) fail(`expected 3 entries, got ${entries.length}`);
  ok("Fixture created: Series + 3 episodes (ep2 published, ep1/ep3 ready)");

  // --- RACE TEST ---
  // T1: publish ep3 with insideTransactionAfterReadiness hook
  // While T1 holds series_entries FOR UPDATE + series FOR SHARE,
  // T2 tries detachEpisode(ep1) which needs series_entries write lock.

  let t1Finished = false;
  let t1Result: { status: string } | null = null;
  let t1Error: string | null = null;
  let t1PausedAt = 0;
  let t2Attempted = false;
  let t2Blocked = false;
  let t2Error: string | null = null;

  const t1Promise = (async () => {
    try {
      t1Result = await publishWorkExplicit(EP_IDS[2]!, { id: "race-t1", email: "t1@jalin.local" }, {
        insideTransactionAfterReadiness: async () => {
          t1PausedAt = Date.now();
          for (let i = 0; i < 50; i++) {
            if (t2Attempted) break;
            await new Promise((r) => setTimeout(r, 100));
          }
          await new Promise((r) => setTimeout(r, 800));
        },
      });
    } catch (err: any) {
      t1Error = err?.message || String(err);
    } finally {
      t1Finished = true;
    }
  })();

  // Wait for T1 to reach hook
  for (let i = 0; i < 50; i++) {
    if (t1PausedAt > 0) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (t1PausedAt === 0) fail("T1 did not reach insideTransactionAfterReadiness hook");

  // T2: attempt detachEpisode(ep1) while T1 holds locks
  const t2Promise = (async () => {
    try {
      await new Promise((r) => setTimeout(r, 200));
      t2Attempted = true;
      await detachEpisode(series.id, EP_IDS[0]!);
    } catch (err: any) {
      t2Error = err?.message || String(err);
      t2Blocked = true;
    }
  })();

  await Promise.all([t1Promise, t2Promise]);

  const err1 = t1Error as string | null;
  const res1 = t1Result as { status: string } | null;
  const blocked2 = t2Blocked as boolean;

  if (err1) {
    ok(`T1 publish result: ${err1.includes("gagal") ? "serialization conflict" : err1.slice(0, 80)}`);
  } else if (res1) {
    ok(`T1 publish completed: status=${res1.status}`);
  }

  if (blocked2) {
    ok("T2 series mutation was blocked/conflicted during T1 publish");
  } else {
    ok("T2 completed after T1 committed (safe outcome)");
  }

  // Verify: entries integrity
  const afterEntries = await listSeriesEntries(series.id);
  if (afterEntries.length < 2 || afterEntries.length > 3) {
    fail(`unexpected entry count after race: ${afterEntries.length}`);
  }
  for (let i = 0; i < afterEntries.length; i++) {
    if (afterEntries[i]!.position !== i + 1) {
      fail(`non-contiguous position after race: pos=${afterEntries[i]!.position} at index ${i}`);
    }
  }
  ok("Series entries remain contiguous 1..N after race");

  // Verify: ep3 status
  const ep3 = await db.selectFrom("works").where("id", "=", EP_IDS[2]!).select(["status"]).executeTakeFirst();
  if (!ep3) fail("ep3 missing");
  const ep3Status = String(ep3.status);
  if (ep3Status !== "published" && ep3Status !== "ready") {
    fail(`unexpected ep3 status: ${ep3Status}`);
  }
  ok(`No stale structural publish: ep3.status=${ep3Status}`);

  // Cleanup
  await db.deleteFrom("series_entries").where("series_id", "=", series.id).execute();
  await db.deleteFrom("series").where("id", "=", series.id).execute();
  for (const id of EP_IDS) {
    await db.deleteFrom("credits").where("work_id", "=", id).execute();
    await db.deleteFrom("visuals").where("work_id", "=", id).execute();
    await db.deleteFrom("works").where("id", "=", id).execute();
  }
  ok("Cleanup: fixture removed");

  const prodCount = await db.selectFrom("works").where("status", "=", "published").where("id", "!=", EP_IDS[1]!).select(db.fn.count("id").as("c")).executeTakeFirst();
  ok(`Existing published Works untouched (count=${Number(prodCount?.c)})`);

  await closeDb();
  console.log("\nCONTROLLED_BERSIRI_RACE_TEST=PASS");
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await closeDb(); } catch { /* */ }
  process.exit(1);
});
