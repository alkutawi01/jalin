/**
 * Waktu Sebenar Rehydration Script (Phase 4E)
 *
 * Deterministic, idempotent import of JLN-NOV-9990 into the database.
 * Running this script twice will NOT create duplicate works, sections, credits, or visuals.
 *
 * Source: content/manuscripts/Waktu_Sebenar_Structural_Edit_v1.0.txt
 * Structure: 30 BAB + EPILOG = 31 reading sections
 * Author: Nara Zahin (nara-zahin, initial_draft)
 * Visuals: hero.png, abah.png, konflik.png
 * Status: review (NOT published)
 *
 * DO NOT run this against production Neon directly.
 * This script is for local/staging validation only.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb, hasDb, closeDb } from "../src/lib/db";

const WORK_ID = "JLN-NOV-9990";
const MANUSCRIPT_PATH = resolve(__dirname, "../content/manuscripts/Waktu_Sebenar_Structural_Edit_v1.0.txt");

function parseManuscript(): { slug: string; title: string; body: string; position: number }[] {
  const raw = readFileSync(MANUSCRIPT_PATH, "utf-8");
  const lines = raw.split("\n");
  const sections: { slug: string; title: string; body: string; position: number }[] = [];
  let current: { slug: string; title: string; body: string; position: number } | null = null;
  let position = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(BAB \d+|EPILOG)$/);
    if (match) {
      if (current) sections.push(current);
      const title = match[1];
      const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      current = { slug, title, body: "", position };
      position++;
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

async function main() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = getDb();
  const nowIso = new Date().toISOString();

  console.log("=== WAKTU SEBENAR REHYDRATION (Phase 4E) ===\n");

  // 1. Parse manuscript
  const sections = parseManuscript();
  const words = sections.reduce((sum, s) => sum + s.body.split(/\s+/).length, 0);
  const readingMinutes = Math.ceil(words / 200);
  console.log(`1. Manuscript: ${sections.length} sections, ~${words} words, ~${readingMinutes} min`);

  // 2. Check if work already exists
  const existing = await db.selectFrom("works").where("id", "=", WORK_ID).select(["id", "status"]).executeTakeFirst();
  if (existing) {
    console.log(`2. Work ${WORK_ID} already exists (status: ${existing.status}) — updating`);
    await db.updateTable("works").where("id", "=", WORK_ID).set({
      title: "Waktu Sebenar",
      slug: "waktu-sebenar",
      type: "novela",
      status: "review",
      version: "v1.0",
      genre: "Drama",
      audience: "remaja",
      dek: "Sebuah kisah tentang Wardah yang pulang ke kedai jam arwah abahnya, menemui bahawa masa bukan sekadar angka pada dinding.",
      reading_minutes: readingMinutes,
      body: "",
      updated_at: nowIso,
    }).execute();
  } else {
    console.log(`2. Creating work ${WORK_ID}`);
    await db.insertInto("works").values({
      id: WORK_ID,
      slug: "waktu-sebenar",
      title: "Waktu Sebenar",
      type: "novela",
      status: "review",
      version: "v1.0",
      genre: "Drama",
      audience: "remaja",
      dek: "Sebuah kisah tentang Wardah yang pulang ke kedai jam arwah abahnya, menemui bahawa masa bukan sekadar angka pada dinding.",
      reading_minutes: readingMinutes,
      body: "",
      editorial_history: JSON.stringify([]),
      updated_at: nowIso,
      created_at: nowIso,
    } as never).execute();
  }

  // 3. Clear and re-insert sections (idempotent)
  await db.deleteFrom("reading_sections").where("work_id", "=", WORK_ID).execute();
  for (const section of sections) {
    await db.insertInto("reading_sections").values({
      work_id: WORK_ID,
      slug: section.slug,
      title: section.title,
      body: section.body.trim(),
      position: section.position,
      created_at: nowIso,
      updated_at: nowIso,
    }).execute();
  }
  console.log(`3. Sections: ${sections.length} imported (positions 1..${sections.length})`);

  // 4. Author credit (idempotent)
  const existingCredit = await db.selectFrom("credits")
    .where("work_id", "=", WORK_ID)
    .where("contributor_slug", "=", "nara-zahin")
    .select(["id"])
    .executeTakeFirst();
  if (!existingCredit) {
    await db.insertInto("credits").values({
      work_id: WORK_ID,
      contributor_slug: "nara-zahin",
      role_label: "initial_draft",
      byline: true,
      is_public: true,
      sort_order: 1,
      created_at: nowIso,
    }).execute();
    console.log("4. Author credit: nara-zahin (initial_draft) added");
  } else {
    console.log("4. Author credit: nara-zahin already exists — skipped");
  }

  // 5. Visual mappings (idempotent)
  const existingVisuals = await db.selectFrom("visuals")
    .where("work_id", "=", WORK_ID)
    .select(["id", "src"])
    .execute();
  const existingSrcs = new Set(existingVisuals.map((v) => v.src));

  const visuals = [
    { role: "hero", src: "/visuals/waktu-sebenar/hero.png", alt: "Kedai jam lama dengan puluhan jam berdetik serentak, cahaya petang menembusi tingkap debu", sort_order: 0 },
    { role: "inline", src: "/visuals/waktu-sebenar/abah.png", alt: "Abah keluar dari bilik belakang memegang jam poket terbuka, mata tertumpu pada mekanismen", sort_order: 1, anchor: "Bunyi kecil datang dari bilik belakang", place: "after" as const },
    { role: "inline", src: "/visuals/waktu-sebenar/konflik.png", alt: "Wardah dan Abah berdepan di kedai jam, ketegangan emosi antara dua generasi", sort_order: 2, anchor: "Abah memandangnya buat kali pertama", place: "after" as const },
  ];

  let visualsAdded = 0;
  for (const v of visuals) {
    if (!existingSrcs.has(v.src)) {
      await db.insertInto("visuals").values({
        work_id: WORK_ID,
        role: v.role,
        src: v.src,
        alt: v.alt,
        provider: "Magnific AI",
        anchor: v.anchor ?? null,
        place: v.place ?? "after",
        sort_order: v.sort_order,
        created_at: nowIso,
      } as never).execute();
      visualsAdded++;
    }
  }
  console.log(`5. Visuals: ${visualsAdded} added, ${existingVisuals.length} already existed`);

  // 6. Revision v1.0 (idempotent — check if exists)
  const existingRev = await db.selectFrom("work_revisions")
    .where("work_id", "=", WORK_ID)
    .where("version_label", "=", "v1.0")
    .select(["id"])
    .executeTakeFirst();
  if (!existingRev) {
    const revisionId = `rev_${WORK_ID}_1_${Date.now()}`;
    const snapshot = {
      id: WORK_ID,
      slug: "waktu-sebenar",
      title: "Waktu Sebenar",
      type: "novela",
      status: "review",
      genre: "Drama",
      audience: "remaja",
      dek: "Sebuah kisah tentang Wardah yang pulang ke kedai jam arwah abahnya, menemui bahawa masa bukan sekadar angka pada dinding.",
      readingMinutes,
      body: "",
      sections: sections.map((s) => ({ slug: s.slug, title: s.title, body: s.body.trim(), position: s.position })),
      credits: [{ contributor_slug: "nara-zahin", role_label: "initial_draft", byline: true }],
      visuals: visuals.map((v) => ({ role: v.role, src: v.src, alt: v.alt, anchor: v.anchor, place: v.place })),
      glossary: [],
      sourceWork: null,
      series: null,
      version: "v1.0",
      versionLabel: "v1.0",
      revisionCount: 1,
      publishedRevisionId: null,
      publishedAt: null,
      publishedBy: null,
      firstPublishedAt: null,
      editorialHistory: [],
    };
    await db.insertInto("work_revisions").values({
      id: revisionId,
      work_id: WORK_ID,
      revision_no: 1,
      version_label: "v1.0",
      change_type: "major",
      revision_summary: "Rehydration: 30 BAB + EPILOG, Nara Zahin credit, 3 visuals",
      snapshot: JSON.stringify(snapshot) as never,
      content_hash: "rehydration_v1.0",
      published_by: "system",
      published_at: nowIso,
      created_at: nowIso,
    } as never).execute();
    await db.updateTable("works").where("id", "=", WORK_ID).set({
      revision_count: 1,
      version_label: "v1.0",
      updated_at: nowIso,
    }).execute();
    console.log(`6. Revision v1.0 created: ${revisionId}`);
  } else {
    console.log(`6. Revision v1.0 already exists: ${existingRev.id} — skipped`);
  }

  // 7. Verification
  const work = await db.selectFrom("works").where("id", "=", WORK_ID).selectAll().executeTakeFirst();
  const sectionCount = await db.selectFrom("reading_sections").where("work_id", "=", WORK_ID).execute();
  const creditCount = await db.selectFrom("credits").where("work_id", "=", WORK_ID).execute();
  const visualCount = await db.selectFrom("visuals").where("work_id", "=", WORK_ID).execute();
  const revisionCount = await db.selectFrom("work_revisions").where("work_id", "=", WORK_ID).execute();

  console.log("\n=== VERIFICATION ===");
  console.log(`Work: ${work?.id} (${work?.title})`);
  console.log(`Type: ${work?.type} | Status: ${work?.status} | Version: ${work?.version}`);
  console.log(`Sections: ${sectionCount.length} | Credits: ${creditCount.length} | Visuals: ${visualCount.length} | Revisions: ${revisionCount.length}`);
  console.log(`Body empty: ${(work?.body ?? "").trim().length === 0}`);

  // 8. Production safety check
  const publishedCount = await db.selectFrom("works").where("status", "=", "published").execute();
  console.log(`\nProduction published works: ${publishedCount.length} (untouched)`);

  await closeDb();
  console.log("\n=== REHYDRATION COMPLETE ===");
  console.log("Waktu Sebenar is now in the database as status=review.");
  console.log("DO NOT publish without Director approval.");
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await closeDb(); } catch { /* */ }
  process.exit(1);
});
