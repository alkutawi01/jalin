/**
 * Mobile QA setup: create published fixtures for actual public routes,
 * run viewport tests, then cleanup.
 *
 * Creates:
 * 1. Published Novela with sections → /kategori/novela/[slug]
 * 2. Published Series with episodes → /kategori/bersiri/[seriesSlug]
 * 3. Published Bersiri episode → /kategori/bersiri/[seriesSlug]/[episodeSlug]
 *
 * Admin fixtures also created for Bahagian/Series detail tests.
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
const SER_SLUG = "uji-qa-siri";
const EP_ID = "JLN-BER-9986";
const EP_SLUG = "uji-qa-ep1";

export async function setupFixtures() {
  if (!hasDb()) return null;
  const db = getDb();
  const now = new Date().toISOString();

  await cleanupFixtures();

  // Create published Novela with sections
  await db.insertInto("works").values({
    id: NOV_ID, slug: NOV_SLUG, title: "Uji QA Novela 4D-8R4",
    type: "novela", status: "published", body: "",
    dek: "Fixture ujian QA — bukan untuk pembaca awam.", genre: "Keluarga",
    audience: "remaja", reading_minutes: 10, version: "v0.1",
    editorial_history: JSON.stringify([]),
    published_at: now, published_by: "qa-test",
    updated_at: now, created_at: now,
  } as never).execute();
  await createSection({ workId: NOV_ID, slug: "bab-1", title: "Bab 1", body: "Isi bab pertama untuk ujian QA mobile." });
  await createSection({ workId: NOV_ID, slug: "bab-2", title: "Bab Dua", body: "Isi bab kedua untuk ujian QA mobile." });

  // Add credits + visual for publishability
  await db.insertInto("credits").values({
    work_id: NOV_ID, contributor_slug: null, guest_name: "Uji QA",
    role_label: "Editor", byline: true, is_public: true, sort_order: 0,
  } as never).execute();
  await db.insertInto("visuals").values({
    work_id: NOV_ID, role: "hero",
    src: "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png",
    alt: "Ilustrasi ujian QA", provider: "magnific", creation_id: "smoke-qa",
    place: "after", sort_order: 0, is_asset_finalized: true,
  } as never).execute();

  // Create published Bersiri episode
  await db.insertInto("works").values({
    id: EP_ID, slug: EP_SLUG, title: "Uji QA Episod 1",
    type: "bersiri", status: "published", body: "Isi episod ujian QA mobile.",
    dek: null, genre: "Keluarga", audience: "remaja",
    reading_minutes: 5, version: "v0.1",
    editorial_history: JSON.stringify([]),
    published_at: now, published_by: "qa-test",
    updated_at: now, created_at: now,
  } as never).execute();
  await db.insertInto("credits").values({
    work_id: EP_ID, contributor_slug: null, guest_name: "Uji QA",
    role_label: "Editor", byline: true, is_public: true, sort_order: 0,
  } as never).execute();
  await db.insertInto("visuals").values({
    work_id: EP_ID, role: "hero",
    src: "https://br-nameless-boat-b3kp87fq.storage.c-4.ap-southeast-1.aws.neon.tech/jalin-visuals/assets/visuals/vr-999002-v1-3220fc78.png",
    alt: "Ilustrasi episod ujian QA", provider: "magnific", creation_id: "smoke-qa-ep",
    place: "after", sort_order: 0, is_asset_finalized: true,
  } as never).execute();

  // Create Series and attach published episode
  const series = await createSeries({ slug: SER_SLUG, title: "Siri Uji QA", mode: "continuous", status: "ongoing" });
  await attachEpisode(series.id, EP_ID);

  return { novId: NOV_ID, novSlug: NOV_SLUG, seriesId: series.id, seriesSlug: SER_SLUG, epId: EP_ID, epSlug: EP_SLUG };
}

export async function cleanupFixtures() {
  if (!hasDb()) return;
  const db = getDb();
  const series = await db.selectFrom("series").where("slug", "=", SER_SLUG).select("id").executeTakeFirst();
  if (series) {
    await db.deleteFrom("series_entries").where("series_id", "=", series.id).execute();
    await db.deleteFrom("series").where("id", "=", series.id).execute();
  }
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

async function main() {
  const fixtures = await setupFixtures();
  console.log(JSON.stringify(fixtures));
  await closeDb();
}

if (require.main === module) {
  main().catch(async (err) => { console.error(err); try { await closeDb(); } catch {} process.exit(1); });
}
