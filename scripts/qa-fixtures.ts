/**
 * Mobile QA setup: create temporary fixtures for 5 actual surfaces,
 * run viewport tests, then cleanup.
 *
 * Surfaces tested:
 * 1. Novela reader (via admin preview — same reader components)
 * 2. Bersiri landing (via admin series detail — same layout)
 * 3. Bersiri episode (via admin preview — same reader components)
 * 4. Admin Bahagian (works detail page)
 * 5. Admin Series detail (series detail page)
 *
 * Fixtures are cleaned up after test.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import { createSection } from "../src/lib/admin/section-service";
import {
  createSeries,
  attachEpisode,
} from "../src/lib/admin/series-service";

const NOV_ID = "JLN-NOV-9993";
const NOV_SLUG = "uji-qa-novela";
const SER_ID = "JLN-BER-9985";
const SER_SLUG = "uji-qa-siri";
const EP_ID = "JLN-BER-9986";
const EP_SLUG = "uji-qa-ep1";

export async function setupFixtures() {
  if (!hasDb()) return;
  const db = getDb();
  const now = new Date().toISOString();

  // Cleanup first
  await cleanupFixtures();

  // Create Novela with sections
  await db.insertInto("works").values({
    id: NOV_ID, slug: NOV_SLUG, title: "Uji QA Novela 4D-8R3",
    type: "novela", status: "draft", body: "",
    dek: "Fixture ujian QA.", genre: "Keluarga", audience: "remaja",
    reading_minutes: 10, version: "v0.1",
    editorial_history: JSON.stringify([]),
    published_at: null, published_by: null,
    updated_at: now, created_at: now,
  } as never).execute();
  await createSection({ workId: NOV_ID, slug: "bab-1", title: "Bab 1", body: "Isi bab pertama untuk ujian QA mobile." });
  await createSection({ workId: NOV_ID, slug: "bab-2", title: "Bab Dua", body: "Isi bab kedua untuk ujian QA mobile." });

  // Create Bersiri episode
  await db.insertInto("works").values({
    id: EP_ID, slug: EP_SLUG, title: "Uji QA Episod 1",
    type: "bersiri", status: "draft", body: "Isi episod ujian QA.",
    dek: null, genre: "Keluarga", audience: "remaja",
    reading_minutes: 5, version: "v0.1",
    editorial_history: JSON.stringify([]),
    published_at: null, published_by: null,
    updated_at: now, created_at: now,
  } as never).execute();

  // Create Series and attach episode
  const series = await createSeries({ slug: SER_SLUG, title: "Siri Uji QA", mode: "continuous", status: "ongoing" });
  await attachEpisode(series.id, EP_ID);

  return { novId: NOV_ID, novSlug: NOV_SLUG, seriesId: series.id, seriesSlug: SER_SLUG, epId: EP_ID, epSlug: EP_SLUG };
}

export async function cleanupFixtures() {
  if (!hasDb()) return;
  const db = getDb();

  // Cleanup series
  const series = await db.selectFrom("series").where("slug", "=", SER_SLUG).select("id").executeTakeFirst();
  if (series) {
    await db.deleteFrom("series_entries").where("series_id", "=", series.id).execute();
    await db.deleteFrom("series").where("id", "=", series.id).execute();
  }
  // Cleanup works
  for (const id of [NOV_ID, EP_ID]) {
    await db.deleteFrom("reading_sections").where("work_id", "=", id).execute();
    await db.deleteFrom("series_entries").where("work_id", "=", id).execute();
    await db.deleteFrom("credits").where("work_id", "=", id).execute();
    await db.deleteFrom("visuals").where("work_id", "=", id).execute();
    await db.deleteFrom("glossary_terms").where("work_id", "=", id).execute();
    await db.deleteFrom("visual_requests").where("work_id", "=", id).execute();
    await db.deleteFrom("source_works").where("work_id", "=", id).execute();
    await db.deleteFrom("works").where("id", "=", id).execute();
  }
  await db.deleteFrom("works").where("slug", "=", NOV_SLUG).execute();
  await db.deleteFrom("works").where("slug", "=", EP_SLUG).execute();
}

// CLI entry point
async function main() {
  const fixtures = await setupFixtures();
  console.log(JSON.stringify(fixtures));
  await closeDb();
}

if (require.main === module) {
  main().catch(async (err) => { console.error(err); try { await closeDb(); } catch {} process.exit(1); });
}
