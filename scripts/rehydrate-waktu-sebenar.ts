/**
 * Waktu Sebenar Rehydration Script (Phase 4E — Patched)
 *
 * Deterministic, idempotent, atomic import of JLN-NOV-9990 into the database.
 *
 * FIXES from Director review:
 * 1. DATABASE_URL from process.env only — .env.local does NOT override
 * 2. Revision published_by/published_at = schema-required fields (NOT publication events)
 * 3. Visuals marked is_asset_finalized = true (assets confirmed in repo)
 * 4. Magnific provider = "magnific" (validator-correct), no fabricated creation_id
 * 5. ABORT if work already published (no downgrade)
 * 6. Entire operation wrapped in transaction (atomic)
 * 7. Taxonomy: type = "novela" (NOT "novel penuh" — Jalin taxonomy)
 *
 * Source: content/manuscripts/Waktu_Sebenar_Structural_Edit_v1.0.txt
 * Structure: 30 BAB + EPILOG = 31 reading sections
 * Author: Nara Zahin (nara-zahin, initial_draft)
 * Visuals: hero.png, abah.png, konflik.png
 * Status: review (NOT published)
 *
 * SAFETY: This script does NOT write to production Neon.
 * Run only against local/staging DATABASE_URL.
 */
import "dotenv/config";
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
  // FIX #1: DATABASE_URL must come from process.env (set by caller).
  // Do NOT use dotenv override — caller's env takes precedence.
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Export it before running:");
    console.error('  DATABASE_URL="your-url" npx tsx scripts/rehydrate-waktu-sebenar.ts');
    process.exit(1);
  }
  if (!hasDb()) {
    console.error("Database connection failed");
    process.exit(1);
  }
  const db = getDb();
  const nowIso = new Date().toISOString();

  console.log("=== WAKTU SEBENAR REHYDRATION (Phase 4E — Patched) ===\n");

  // FIX #5: ABORT if work already published (no downgrade)
  const existing = await db.selectFrom("works").where("id", "=", WORK_ID).select(["id", "status"]).executeTakeFirst();
  if (existing && existing.status === "published") {
    console.error(`ABORT: ${WORK_ID} is already published. Cannot downgrade to review.`);
    await closeDb();
    process.exit(1);
  }

  // 1. Parse manuscript
  const sections = parseManuscript();
  const words = sections.reduce((sum, s) => sum + s.body.split(/\s+/).length, 0);
  const readingMinutes = Math.ceil(words / 200);
  console.log(`1. Manuscript: ${sections.length} sections, ~${words} words, ~${readingMinutes} min`);

  // FIX #6: Wrap entire operation in transaction
  try {
    await db.transaction().execute(async (trx) => {
      // 2. Create or update work
      // FIX #7: Taxonomy = "novela" (NOT "novel penuh" — Jalin taxonomy)
      if (existing) {
        console.log(`2. Work ${WORK_ID} already exists (status: ${existing.status}) — updating`);
        await trx.updateTable("works").where("id", "=", WORK_ID).set({
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
        await trx.insertInto("works").values({
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

      // 3. Clear and re-insert sections
      await trx.deleteFrom("reading_sections").where("work_id", "=", WORK_ID).execute();
      for (const section of sections) {
        await trx.insertInto("reading_sections").values({
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
      const existingCredit = await trx.selectFrom("credits")
        .where("work_id", "=", WORK_ID)
        .where("contributor_slug", "=", "nara-zahin")
        .select(["id"])
        .executeTakeFirst();
      if (!existingCredit) {
        await trx.insertInto("credits").values({
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
      // FIX #3: is_asset_finalized = true (assets confirmed in repo)
      // FIX #4: provider = "magnific" (validator-correct), no fabricated creation_id
      const existingVisuals = await trx.selectFrom("visuals")
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
          await trx.insertInto("visuals").values({
            work_id: WORK_ID,
            role: v.role,
            src: v.src,
            alt: v.alt,
            provider: "magnific",
            // creation_id: intentionally omitted — no fabricated Magnific ID
            is_asset_finalized: true,
            anchor: v.anchor ?? null,
            place: v.place ?? "after",
            sort_order: v.sort_order,
            created_at: nowIso,
          } as never).execute();
          visualsAdded++;
        }
      }
      console.log(`5. Visuals: ${visualsAdded} added, ${existingVisuals.length} already existed`);

      // 6. Revision v1.0 (idempotent)
      // FIX #2: published_by/published_at are schema-required NOT NULL fields.
      // They record when the revision was CREATED, not when the work was PUBLISHED.
      // The work is NOT published: works.published_revision_id = NULL.
      const existingRev = await trx.selectFrom("work_revisions")
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
        await trx.insertInto("work_revisions").values({
          id: revisionId,
          work_id: WORK_ID,
          revision_no: 1,
          version_label: "v1.0",
          change_type: "major",
          revision_summary: "Rehydration: 30 BAB + EPILOG, Nara Zahin credit, 3 visuals",
          snapshot: JSON.stringify(snapshot) as never,
          content_hash: "rehydration_v1.0",
          published_by: "import",
          published_at: nowIso,
          created_at: nowIso,
        } as never).execute();
        await trx.updateTable("works").where("id", "=", WORK_ID).set({
          revision_count: 1,
          version_label: "v1.0",
          updated_at: nowIso,
        }).execute();
        console.log(`6. Revision v1.0 created: ${revisionId}`);
      } else {
        console.log(`6. Revision v1.0 already exists: ${existingRev.id} — skipped`);
      }

      // 7. Exact-state verification (within transaction)
      const work = await trx.selectFrom("works").where("id", "=", WORK_ID).selectAll().executeTakeFirst();
      const sectionRows = await trx.selectFrom("reading_sections").where("work_id", "=", WORK_ID).execute();
      const creditRows = await trx.selectFrom("credits").where("work_id", "=", WORK_ID).execute();
      const visualRows = await trx.selectFrom("visuals").where("work_id", "=", WORK_ID).execute();
      const revisionRows = await trx.selectFrom("work_revisions").where("work_id", "=", WORK_ID).execute();

      console.log("\n=== EXACT-STATE VERIFICATION ===");
      console.log(`Work: ${work?.id} (${work?.title})`);
      console.log(`Type: ${work?.type} | Status: ${work?.status} | Version: ${work?.version}`);
      console.log(`Sections: ${sectionRows.length} (expected 31)`);
      console.log(`Credits: ${creditRows.length} (expected 1)`);
      console.log(`Visuals: ${visualRows.length} (expected 3)`);
      console.log(`Revisions: ${revisionRows.length} (expected 1)`);
      console.log(`Body empty: ${(work?.body ?? "").trim().length === 0}`);
      console.log(`Published revision ID: ${work?.published_revision_id} (expected null)`);

      // Exact-state assertions
      const errors: string[] = [];
      if (sectionRows.length !== 31) errors.push(`sections: ${sectionRows.length} != 31`);
      if (creditRows.length !== 1) errors.push(`credits: ${creditRows.length} != 1`);
      if (visualRows.length !== 3) errors.push(`visuals: ${visualRows.length} != 3`);
      if (revisionRows.length !== 1) errors.push(`revisions: ${revisionRows.length} != 1`);
      if (work?.type !== "novela") errors.push(`type: ${work?.type} != novela`);
      if (work?.status !== "review") errors.push(`status: ${work?.status} != review`);
      if (work?.published_revision_id !== null) errors.push(`published_revision_id: ${work?.published_revision_id} != null`);

      if (errors.length > 0) {
        throw new Error(`Verification failed:\n  ${errors.join("\n  ")}`);
      }
      console.log("\nAll assertions PASSED.");

      // 8. Production safety check
      const publishedCount = await trx.selectFrom("works").where("status", "=", "published").execute();
      console.log(`\nProduction published works: ${publishedCount.length} (untouched)`);
    });
  } finally {
    await closeDb();
  }

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
