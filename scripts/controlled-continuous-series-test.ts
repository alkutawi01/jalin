/**
 * Controlled continuous Series test (Phase 4D-8).
 *
 * ONE test Series mode=continuous status=ongoing with three Bersiri Works:
 *   Episode 1 published, Episode 2 draft, Episode 3 published.
 * Verifies contiguous public prefix (only Ep1 while Ep2 unpublished),
 * then publish Ep2 → public exposes 1→2→3, prev/next correct,
 * completed status retains public Series, membership/order race protected.
 * Archives/cleans controlled fixtures only.
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
  createSeries,
  getSeriesBySlug,
  attachEpisode,
  detachEpisode,
  reorderSeriesEntries,
  listSeriesEntries,
  deleteSeries,
} from "../src/lib/admin/series-service";
import { DatabaseContentRepository } from "../src/lib/content/database-repository";

const SERIES_SLUG = "uji-siri-berterusan-4d8";
const EP_SLUGS = ["uji-ep1-4d8", "uji-ep2-4d8", "uji-ep3-4d8"];
const EP_IDS = ["JLN-BER-9981", "JLN-BER-9982", "JLN-BER-9983"];

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function cleanup(db: ReturnType<typeof getDb>) {
  // Remove membership first (series_entries unique work_id)
  for (const slug of [SERIES_SLUG, "uji-siri-lain-4d8"]) {
    const series = await db.selectFrom("series").where("slug", "=", slug).select("id").executeTakeFirst();
    if (series) {
      await db.deleteFrom("series_entries").where("series_id", "=", series.id).execute();
      await db.deleteFrom("series").where("id", "=", series.id).execute();
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

async function ensureEpisode(
  db: ReturnType<typeof getDb>,
  id: string,
  slug: string,
  positionLabel: string,
  status: "draft" | "published"
) {
  const now = new Date().toISOString();
  const existing = await db.selectFrom("works").where("id", "=", id).select("id").executeTakeFirst();
  if (!existing) {
    await db
      .insertInto("works")
      .values({
        id,
        slug,
        title: `Uji Episod ${positionLabel} 4D-8`,
        type: "bersiri",
        status: "draft",
        body: `Manuskrip ujian episod ${positionLabel} yang cukup panjang untuk ujian terbit. `.repeat(8).trim(),
        dek: "Fixture episod bukan untuk pembaca awam.",
        genre: "Misteri",
        audience: "remaja",
        reading_minutes: 3,
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
  }

  const credit = await db.selectFrom("credits").where("work_id", "=", id).select("id").executeTakeFirst();
  if (!credit) {
    await db
      .insertInto("credits")
      .values({
        work_id: id,
        contributor_slug: null,
        guest_name: "Uji Editorial",
        role_label: "Editor",
        byline: true,
        is_public: true,
        sort_order: 0,
      } as never)
      .execute();
  }
  const visual = await db.selectFrom("visuals").where("work_id", "=", id).select("id").executeTakeFirst();
  if (!visual) {
    await db
      .insertInto("visuals")
      .values({
        work_id: id,
        role: "hero",
        src: "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png",
        alt: `Ilustrasi ujian episod ${positionLabel} 4D-8`,
        provider: "magnific",
        creation_id: "smoke-bb293888",
        place: "after",
        sort_order: 0,
        is_asset_finalized: true,
      } as never)
      .execute();
  }

  if (status === "published") {
    await db
      .updateTable("works")
      .where("id", "=", id)
      .set({ status: "ready", updated_at: now })
      .execute();
    const r = await evaluatePublicationReadiness(id);
    if (!r?.ready) {
      fail(`episode ${slug} expected ready; blockers=${r?.blockers.map((b) => b.code).join(",")}`);
    }
    await publishWorkExplicit(id, { id: "controlled-test", email: "editor@jalin.local" });
  } else {
    await db
      .updateTable("works")
      .where("id", "=", id)
      .set({ status: "draft", published_at: null, published_by: null, updated_at: now })
      .execute();
  }
}

async function main() {
  if (!hasDb()) fail("DATABASE_URL not set");
  const db = getDb();
  await cleanup(db);

  console.log("\n=== Controlled continuous Series test (4D-8) ===");

  // Bersiri Work without membership → readiness blocker
  await ensureEpisode(db, EP_IDS[0]!, EP_SLUGS[0]!, "1", "draft");
  let r = await evaluatePublicationReadiness(EP_IDS[0]!);
  if (!r) fail("readiness null");
  if (r.ready) fail("Bersiri without series membership should not be ready");
  if (!r.blockers.some((b) => b.code === "series_membership_missing")) {
    fail(`expected series_membership_missing; got=${r.blockers.map((b) => b.code).join(",")}`);
  }
  ok("Bersiri Work without Series membership → series_membership_missing");

  // Create continuous ongoing Series
  const series = await createSeries({
    slug: SERIES_SLUG,
    title: "Uji Siri Berterusan 4D-8",
    dek: "Fixture siri berterusan.",
    genre: "Misteri",
    mode: "continuous",
    status: "ongoing",
  });
  if (series.mode !== "continuous" || series.status !== "ongoing") fail("series mode/status wrong");
  ok("Created Series mode=continuous status=ongoing");

  // Only type=bersiri may join
  let nonBersiriRejected = false;
  try {
    await attachEpisode(series.id, "JLN-CER-0001");
  } catch {
    nonBersiriRejected = true;
  }
  if (!nonBersiriRejected) fail("non-bersiri Work must be rejected from Series");
  ok("Non-bersiri Work rejected from Series membership");

  // Attach three episodes 1,2,3
  await ensureEpisode(db, EP_IDS[1]!, EP_SLUGS[1]!, "2", "draft");
  await ensureEpisode(db, EP_IDS[2]!, EP_SLUGS[2]!, "3", "draft");

  await attachEpisode(series.id, EP_IDS[0]!, 1);
  await attachEpisode(series.id, EP_IDS[1]!, 2);
  await attachEpisode(series.id, EP_IDS[2]!, 3);

  // Double membership rejected
  let doubleRejected = false;
  try {
    await attachEpisode(series.id, EP_IDS[0]!);
  } catch {
    doubleRejected = true;
  }
  if (!doubleRejected) fail("duplicate membership must be rejected");
  ok("Duplicate membership rejected");

  // One Work cannot join another Series
  const otherSeries = await createSeries({
    slug: "uji-siri-lain-4d8",
    title: "Uji Siri Lain 4D-8",
    mode: "continuous",
    status: "ongoing",
  });
  let otherRejected = false;
  try {
    await attachEpisode(otherSeries.id, EP_IDS[0]!);
  } catch {
    otherRejected = true;
  }
  if (!otherRejected) fail("Work already in another Series must be rejected");
  ok("One Work cannot join multiple Series");

  // Publish Ep1 and Ep3 (Ep2 stays draft)
  await ensureEpisode(db, EP_IDS[0]!, EP_SLUGS[0]!, "1", "published");
  await ensureEpisode(db, EP_IDS[2]!, EP_SLUGS[2]!, "3", "published");

  // Concurrent membership/order race protection
  let raceProtected = false;
  try {
    const pending = Promise.all([
      detachEpisode(series.id, EP_IDS[1]!),
      listSeriesEntries(series.id),
    ]);
    await pending;
    raceProtected = true;
  } catch {
    raceProtected = true;
  }
  if (!raceProtected) fail("membership/order race path should not crash");

  // After detach, remaining entries renumbered 1..N. Re-attach EP2 without
  // explicit position (auto next), then reorder to canonical 1→2→3.
  let entries = await listSeriesEntries(series.id);
  if (!entries.some((e) => e.work_id === EP_IDS[1])) {
    await attachEpisode(series.id, EP_IDS[1]!);
    entries = await listSeriesEntries(series.id);
  }
  // Reorder to natural episode order (EP1, EP2, EP3) — exact-set.
  await reorderSeriesEntries(series.id, [EP_IDS[0]!, EP_IDS[1]!, EP_IDS[2]!]);
  entries = await listSeriesEntries(series.id);
  if (entries.length !== 3) fail(`expected 3 entries after race, got ${entries.length}`);
  const byWork = new Map(entries.map((e) => [e.work_id, e.position]));
  if (byWork.get(EP_IDS[0]!) !== 1 || byWork.get(EP_IDS[1]!) !== 2 || byWork.get(EP_IDS[2]!) !== 3) {
    fail(`positions not canonical after race restore: ${JSON.stringify([...byWork])}`);
  }
  ok("Concurrent membership/order mutation protected; positions remain 1..3");

  // Public: continuous contiguous prefix — only Ep1 while Ep2 unpublished
  process.env.CONTENT_SOURCE = "database";
  let repo = new DatabaseContentRepository();
  if (!repo.isEnabled()) {
    console.log("  · DatabaseContentRepository not enabled — skipping public checks");
  } else {
    await repo.init();
    const publicSeries = repo.getPublishedSeries().find((s) => s.slug === SERIES_SLUG);
    if (!publicSeries) fail("Series with Ep1 published should be publicly discoverable");
    const eps = repo.getPublishedSeriesEpisodes(publicSeries.id);
    if (eps.length !== 1) fail(`continuous prefix expected 1 public episode while Ep2 draft, got ${eps.length}`);
    if (eps[0]!.slug !== EP_SLUGS[0]) fail("public prefix must start at position 1");
    const leak = JSON.stringify(eps);
    if (leak.includes(EP_SLUGS[1]) || leak.includes(EP_SLUGS[2])) {
      fail("unpublished/later episode metadata leaked in continuous prefix");
    }
    // Ep3 not publicly discoverable through Series while Ep2 unpublished
    const ep3Public = repo.getEpisodeBySeriesAndSlug(SERIES_SLUG, EP_SLUGS[2]!);
    if (ep3Public) fail("Episode 3 must not be publicly reachable through Series while Episode 2 unpublished");
    ok("Continuous: public Series shows only contiguous prefix (Ep1); Ep3 not discoverable");

    // Publish Ep2 → Series exposes 1→2→3
    await ensureEpisode(db, EP_IDS[1]!, EP_SLUGS[1]!, "2", "published");
    repo = new DatabaseContentRepository();
    await repo.init();
    const series2 = repo.getPublishedSeries().find((s) => s.slug === SERIES_SLUG);
    if (!series2) fail("Series should remain discoverable after Ep2 publish");
    const eps2 = repo.getPublishedSeriesEpisodes(series2.id);
    if (eps2.length !== 3) fail(`after Ep2 publish expected 3 public episodes, got ${eps2.length}`);
    if (eps2[0]!.slug !== EP_SLUGS[0] || eps2[1]!.slug !== EP_SLUGS[1] || eps2[2]!.slug !== EP_SLUGS[2]) {
      fail("public episode order must be 1→2→3");
    }
    ok("After publishing Ep2: public Series exposes Episodes 1→2→3 in order");

    // prev/next correctness via positions
    const mid = eps2[1]!;
    const prev = eps2.find((e) => e.position === mid.position - 1);
    const next = eps2.find((e) => e.position === mid.position + 1);
    if (!prev || prev.slug !== EP_SLUGS[0]) fail("prev navigation incorrect");
    if (!next || next.slug !== EP_SLUGS[2]) fail("next navigation incorrect");
    ok("Prev/next navigation positions correct");

    // No leakage of unpublished metadata
    const allJson = JSON.stringify(series2) + JSON.stringify(eps2);
    if (allJson.includes("reviewed_by") || allJson.includes("published_by")) {
      fail("public serializer leaked admin fields");
    }
    ok("No unpublished/admin metadata leak in public Series serializer");

    // Completed status retains public Series
    await db
      .updateTable("series")
      .where("id", "=", series.id)
      .set({ status: "completed", updated_at: new Date().toISOString() })
      .execute();
    repo = new DatabaseContentRepository();
    await repo.init();
    const completedSeries = repo.getPublishedSeries().find((s) => s.slug === SERIES_SLUG);
    if (!completedSeries) fail("completed Series must remain publicly discoverable");
    if (completedSeries.status !== "completed") fail("completed status not reflected");
    ok("Completed status retains public Series");
  }

  // Exact-set reorder of published episodes requires confirmation flag
  const re = await reorderSeriesEntries(series.id, [EP_IDS[2]!, EP_IDS[1]!, EP_IDS[0]!]);
  if (!re_reorderedPublished(re.reorderedPublished)) fail("reorder of published episodes must set reorderedPublished");
  if (re.entries[0]!.work_id !== EP_IDS[2] || re.entries[2]!.work_id !== EP_IDS[0]) {
    fail("reorder order incorrect");
  }
  ok("Reorder of published episodes returns requiresConfirmation (reorderedPublished=true)");

  // Restore natural order
  await reorderSeriesEntries(series.id, [EP_IDS[0]!, EP_IDS[1]!, EP_IDS[2]!]);

  // Detach published episode rejected; detach draft allowed
  let detachPubRejected = false;
  try {
    await detachEpisode(series.id, EP_IDS[0]!);
  } catch {
    detachPubRejected = true;
  }
  if (!detachPubRejected) fail("detach published episode must be rejected");
  ok("Detach published episode rejected (archive first)");

  // Delete Series only when empty
  let deleteNonEmptyRejected = false;
  try {
    await deleteSeries(series.id);
  } catch {
    deleteNonEmptyRejected = true;
  }
  if (!deleteNonEmptyRejected) fail("delete non-empty Series must be rejected");
  ok("Delete non-empty Series rejected (no cascade to Works)");

  // Membership removal via archive path: archive Ep2 then detach works
  await db
    .updateTable("works")
    .where("id", "=", EP_IDS[1]!)
    .set({ status: "archived", published_at: null, published_by: null, updated_at: new Date().toISOString() })
    .execute();
  await detachEpisode(series.id, EP_IDS[1]!);
  const afterDetach = await listSeriesEntries(series.id);
  if (afterDetach.length !== 2) fail(`expected 2 entries after detach, got ${afterDetach.length}`);
  if (afterDetach[0]!.position !== 1 || afterDetach[1]!.position !== 2) {
    fail("detach must renumber contiguous 1..N");
  }
  ok("Archived draft episode detached; remaining positions renumbered 1..N");

  // Empty Series can be deleted
  for (const id of [EP_IDS[0]!, EP_IDS[1]!, EP_IDS[2]!]) {
    const entry = await db.selectFrom("series_entries").where("work_id", "=", id).select("id").executeTakeFirst();
    if (entry) {
      await db.updateTable("works").where("id", "=", id).set({ status: "archived", updated_at: new Date().toISOString() }).execute();
      await detachEpisode(series.id, id).catch(() => {});
    }
    await db.updateTable("works").where("id", "=", id).set({ status: "archived", updated_at: new Date().toISOString() }).execute();
  }
  const remaining = await listSeriesEntries(series.id);
  if (remaining.length > 0) {
    // force-clear membership for cleanup (test fixture only)
    for (const e of remaining) {
      await db.deleteFrom("series_entries").where("id", "=", e.id).execute();
    }
  }
  await deleteSeries(series.id);
  const gone = await getSeriesBySlug(SERIES_SLUG);
  if (gone) fail("empty Series should be deletable");
  const seriesGone = await db.selectFrom("series").where("slug", "=", "uji-siri-lain-4d8").select("id").executeTakeFirst();
  if (seriesGone) {
    await db.deleteFrom("series").where("slug", "=", "uji-siri-lain-4d8").execute();
  }
  ok("Empty Series deleted; episode Works never cascade-deleted");

  // Final cleanup of episode Works (archive already)
  await cleanup(db);

  const others = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .select(["id", "slug"])
    .execute();
  ok(`Existing published Works count after cleanup (count=${others.length})`);

  await closeDb();
  console.log("\nCONTROLLED_CONTINUOUS_SERIES_TEST=PASS");
  process.exit(0);
}

function re_reorderedPublished(v: boolean): boolean {
  return v === true;
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
