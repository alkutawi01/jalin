/**
 * Controlled anthology Series test (Phase 4D-8).
 *
 * Small synthetic anthology fixture: positions 1 published, 2 draft, 3 published.
 * Expected public Series: Episode 1 and Episode 3 only (independent episodes).
 * Navigation follows published positions. No leakage of Episode 2 metadata.
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
  listSeriesEntries,
  deleteSeries,
} from "../src/lib/admin/series-service";
import { DatabaseContentRepository } from "../src/lib/content/database-repository";

const SERIES_SLUG = "uji-anthologi-4d8";
const EP_SLUGS = ["uji-an-ep1-4d8", "uji-an-ep2-4d8", "uji-an-ep3-4d8"];
const EP_IDS = ["JLN-BER-9971", "JLN-BER-9972", "JLN-BER-9973"];

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function cleanup(db: ReturnType<typeof getDb>) {
  const series = await db.selectFrom("series").where("slug", "=", SERIES_SLUG).select("id").executeTakeFirst();
  if (series) {
    await db.deleteFrom("series_entries").where("series_id", "=", series.id).execute();
    await db.deleteFrom("series").where("id", "=", series.id).execute();
  }
  for (const id of EP_IDS) {
    await db.deleteFrom("reading_sections").where("work_id", "=", id).execute();
    await db.deleteFrom("series_entries").where("work_id", "=", id).execute();
    await db.deleteFrom("credits").where("work_id", "=", id).execute();
    await db.deleteFrom("visuals").where("work_id", "=", id).execute();
    await db.deleteFrom("glossary_terms").where("work_id", "=", id).execute();
    await db.deleteFrom("visual_requests").where("work_id", "=", id).execute();
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
  label: string,
  status: "draft" | "ready" | "archived" | "published"
) {
  const now = new Date().toISOString();
  const existing = await db.selectFrom("works").where("id", "=", id).select("id").executeTakeFirst();
  if (!existing) {
    await db
      .insertInto("works")
      .values({
        id,
        slug,
        title: `Uji Antologi Episod ${label} 4D-8`,
        type: "bersiri",
        status: "draft",
        body: `Manuskrip uji antologi episod ${label} yang cukup panjang. `.repeat(8).trim(),
        dek: "Fixture antologi bukan untuk pembaca awam.",
        genre: "Sains",
        audience: "remaja",
        reading_minutes: 3,
        version: "v0.1",
        editorial_history: JSON.stringify([
          { version: "v0.1", type: "initial", summary: "Draf ujian antologi 4D-8", date: now },
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
        alt: `Ilustrasi antologi episod ${label} 4D-8`,
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
      fail(`anthology episode ${slug} expected ready; blockers=${r?.blockers.map((b) => b.code).join(",")}`);
    }
    await publishWorkExplicit(id, { id: "controlled-test", email: "editor@jalin.local" });
  } else {
    await db
      .updateTable("works")
      .where("id", "=", id)
      .set({ status, published_at: null, published_by: null, updated_at: now })
      .execute();
  }
}

async function main() {
  if (!hasDb()) fail("DATABASE_URL not set");
  const db = getDb();
  await cleanup(db);

  console.log("\n=== Controlled anthology Series test (4D-8) ===");

  const series = await createSeries({
    slug: SERIES_SLUG,
    title: "Uji Antologi 4D-8",
    dek: "Fixture antologi pendek.",
    genre: "Sains",
    mode: "anthology",
    status: "ongoing",
  });
  if (series.mode !== "anthology") fail("series mode must be anthology");
  ok("Created Series mode=anthology");

  await ensureEpisode(db, EP_IDS[0]!, EP_SLUGS[0]!, "1", "draft");
  await ensureEpisode(db, EP_IDS[1]!, EP_SLUGS[1]!, "2", "draft");
  await ensureEpisode(db, EP_IDS[2]!, EP_SLUGS[2]!, "3", "draft");

  await attachEpisode(series.id, EP_IDS[0]!, 1);
  await attachEpisode(series.id, EP_IDS[1]!, 2);
  await attachEpisode(series.id, EP_IDS[2]!, 3);

  // Positions 1 published, 2 draft, 3 published
  await ensureEpisode(db, EP_IDS[0]!, EP_SLUGS[0]!, "1", "published");
  await ensureEpisode(db, EP_IDS[1]!, EP_SLUGS[1]!, "2", "draft");
  await ensureEpisode(db, EP_IDS[2]!, EP_SLUGS[2]!, "3", "published");

  process.env.CONTENT_SOURCE = "database";
  const repo = new DatabaseContentRepository();
  if (!repo.isEnabled()) {
    console.log("  · DatabaseContentRepository not enabled — skipping public checks");
  } else {
    await repo.init();
    const publicSeries = repo.getPublishedSeries().find((s) => s.slug === SERIES_SLUG);
    if (!publicSeries) fail("anthology with published episodes should be discoverable");

    const eps = repo.getPublishedSeriesEpisodes(publicSeries.id);
    if (eps.length !== 2) {
      fail(`anthology public episodes expected 2 (Ep1+Ep3), got ${eps.length}: ${eps.map((e) => e.slug).join(",")}`);
    }
    const slugs = eps.map((e) => e.slug);
    if (!slugs.includes(EP_SLUGS[0]!)) fail("Episode 1 must be public in anthology");
    if (!slugs.includes(EP_SLUGS[2]!)) fail("Episode 3 must be public in anthology");
    if (slugs.includes(EP_SLUGS[1]!)) fail("Episode 2 (draft) must NOT be public in anthology");

    // No leakage of Episode 2 metadata
    const leak = JSON.stringify(eps) + JSON.stringify(publicSeries);
    if (leak.includes(EP_SLUGS[1]!)) fail("Episode 2 slug leaked in public anthology serializer");
    if (leak.includes("Uji Antologi Episod 2")) fail("Episode 2 title leaked in public anthology serializer");

    const ep2 = repo.getEpisodeBySeriesAndSlug(SERIES_SLUG, EP_SLUGS[1]!);
    if (ep2) fail("draft Episode 2 must not be reachable via Series episode route");

    ok("Anthology public Series shows Episode 1 + Episode 3 only; Episode 2 no leak");

    // Navigation follows published positions
    const byPos = [...eps].sort((a, b) => a.position - b.position);
    if (byPos[0]!.position !== 1 || byPos[1]!.position !== 3) {
      fail(`anthology nav positions expected 1 then 3, got ${byPos.map((e) => e.position).join(",")}`);
    }
    // prev of Ep3 should be Ep1 (published positions only)
    const ep3Idx = byPos.findIndex((e) => e.slug === EP_SLUGS[2]);
    const prevOfEp3 = byPos[ep3Idx - 1];
    if (!prevOfEp3 || prevOfEp3.slug !== EP_SLUGS[0]) {
      fail("anthology prev of Ep3 should be Ep1 (published positions)");
    }
    ok("Anthology navigation follows published positions (1 → 3)");

    // Zero published eligible episodes → not discoverable
    await db
      .updateTable("works")
      .where("id", "in", [EP_IDS[0]!, EP_IDS[2]!])
      .set({ status: "archived", published_at: null, published_by: null, updated_at: new Date().toISOString() })
      .execute();
    const emptyRepo = new DatabaseContentRepository();
    await emptyRepo.init();
    const goneSeries = emptyRepo.getPublishedSeries().find((s) => s.slug === SERIES_SLUG);
    if (goneSeries) fail("zero eligible episodes → Series must not be publicly discoverable");
    ok("Zero publicly eligible episodes → Series not discoverable");
  }

  const entries = await listSeriesEntries(series.id);
  if (entries.length !== 3) fail(`expected 3 entries, got ${entries.length}`);
  ok("Membership intact (3 entries) — no destructive cascade");

  // Cleanup
  await cleanup(db);
  const gone = await getSeriesBySlug(SERIES_SLUG);
  if (gone) fail("series cleanup failed");
  ok("Cleanup: anthology fixture removed");

  await closeDb();
  console.log("\nCONTROLLED_ANTHOLOGY_TEST=PASS");
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
