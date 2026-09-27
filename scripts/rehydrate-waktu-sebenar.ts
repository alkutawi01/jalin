/**
 * Waktu Sebenar Rehydration Script (Phase 4E — Final)
 *
 * Deterministic, idempotent, atomic import of JLN-NOV-9990 into the database.
 *
 * SAFETY RULES (from Director):
 * 1. DATABASE_URL from process.env ONLY — no dotenv loading at all
 * 2. NO work_revisions creation — revisions are published snapshots only
 * 3. Race-safe abort — row lock FOR UPDATE inside transaction
 * 4. Exact-state verification — assert exact values, not just counts
 * 5. Visuals finalized, Magnific provenance, taxonomy novela
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
  // FIX #1: DATABASE_URL must come from process.env ONLY — no dotenv loading.
  // The caller MUST set DATABASE_URL in their environment.
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

  console.log("=== WAKTU SEBENAR REHYDRATION (Phase 4E — Final) ===\n");

  // 1. Parse manuscript
  const sections = parseManuscript();
  const words = sections.reduce((sum, s) => sum + s.body.split(/\s+/).length, 0);
  const readingMinutes = Math.ceil(words / 200);
  console.log(`1. Manuscript: ${sections.length} sections, ~${words} words, ~${readingMinutes} min`);

  // FIX #2: Race-safe abort — check status INSIDE transaction with FOR UPDATE
  try {
    await db.transaction().execute(async (trx) => {
      // Lock the row to prevent concurrent publication
      const locked = await trx
        .selectFrom("works")
        .where("id", "=", WORK_ID)
        .select(["id", "status"])
        .forUpdate()
        .executeTakeFirst();

      // FIX #2: Abort if published (race-safe under lock)
      if (locked && locked.status === "published") {
        throw new Error(`ABORT: ${WORK_ID} is already published. Cannot downgrade to review.`);
      }

      // 2. Create or update work
      // FIX #5: revision_count = 0, no publication fields
      if (locked) {
        console.log(`2. Work ${WORK_ID} already exists (status: ${locked.status}) — updating`);
        await trx.updateTable("works").where("id", "=", WORK_ID).set({
          title: "Waktu Sebenar",
          slug: "waktu-sebenar",
          type: "novela",
          status: "review",
          version: "v1.0",
          version_label: "v1.0",
          genre: "Drama",
          audience: "remaja",
          dek: "Sebuah kisah tentang Wardah yang pulang ke kedai jam arwah abahnya, menemui bahawa masa bukan sekadar angka pada dinding.",
          reading_minutes: readingMinutes,
          body: "",
          revision_count: 0,
          published_revision_id: null,
          published_at: null,
          published_by: null,
          first_published_at: null,
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
          version_label: "v1.0",
          genre: "Drama",
          audience: "remaja",
          dek: "Sebuah kisah tentang Wardah yang pulang ke kedai jam arwah abahnya, menemui bahawa masa bukan sekadar angka pada dinding.",
          reading_minutes: readingMinutes,
          body: "",
          revision_count: 0,
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
      // is_asset_finalized = true (assets confirmed in repo)
      // provider = "magnific" (validator-correct), no fabricated creation_id
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

      // FIX #3: NO work_revisions creation.
      // work_revisions = published snapshots only.
      // First revision created by publication flow when Director publishes.
      // Clean up any old revisions from previous runs (should not exist for review work).
      // Clean up any old revisions from previous runs (should not exist for review work).
      await trx.deleteFrom("work_revisions").where("work_id", "=", WORK_ID).execute();
      console.log("6. Revision: NOT created (work_revisions = published snapshots only)");

      // FIX #4: Exact-state verification (within transaction)
      const work = await trx.selectFrom("works").where("id", "=", WORK_ID).selectAll().executeTakeFirst();
      const sectionRows = await trx.selectFrom("reading_sections")
        .where("work_id", "=", WORK_ID)
        .select(["slug", "title", "body", "position"])
        .orderBy("position", "asc")
        .execute();
      const creditRows = await trx.selectFrom("credits")
        .where("work_id", "=", WORK_ID)
        .select(["contributor_slug", "role_label", "byline"])
        .execute();
      const visualRows = await trx.selectFrom("visuals")
        .where("work_id", "=", WORK_ID)
        .select(["role", "src", "alt", "provider", "is_asset_finalized", "anchor", "place"])
        .orderBy("sort_order", "asc")
        .execute();
      const revisionRows = await trx.selectFrom("work_revisions")
        .where("work_id", "=", WORK_ID)
        .select(["id"])
        .execute();

      console.log("\n=== EXACT-STATE VERIFICATION ===");

      // Verify sections: exact slugs and positions
      const expectedSlugs = sections.map((s) => s.slug);
      const actualSlugs = sectionRows.map((s: any) => String(s.slug ?? ""));
      const expectedPositions = sections.map((s) => s.position);
      const actualPositions = sectionRows.map((s: any) => Number(s.position ?? 0));

      const errors: string[] = [];

      // Work fields
      if (work?.id !== WORK_ID) errors.push(`work.id: ${work?.id} != ${WORK_ID}`);
      if (work?.type !== "novela") errors.push(`work.type: ${work?.type} != novela`);
      if (work?.status !== "review") errors.push(`work.status: ${work?.status} != review`);
      if (work?.version !== "v1.0") errors.push(`work.version: ${work?.version} != v1.0`);
      if (work?.version_label !== "v1.0") errors.push(`work.version_label: ${work?.version_label} != v1.0`);
      if ((work?.revision_count ?? -1) !== 0) errors.push(`work.revision_count: ${work?.revision_count} != 0`);
      if (work?.published_revision_id !== null) errors.push(`work.published_revision_id: ${work?.published_revision_id} != null`);
      if (work?.published_at !== null) errors.push(`work.published_at: ${work?.published_at} != null`);
      if (work?.published_by !== null) errors.push(`work.published_by: ${work?.published_by} != null`);
      if (work?.first_published_at !== null) errors.push(`work.first_published_at: ${work?.first_published_at} != null`);
      if ((work?.body ?? "").trim().length !== 0) errors.push(`work.body: not empty`);

      // Sections: exact count, slugs, positions
      if (sectionRows.length !== 31) errors.push(`sections: ${sectionRows.length} != 31`);
      if (JSON.stringify(actualSlugs) !== JSON.stringify(expectedSlugs)) {
        errors.push(`section slugs mismatch: ${actualSlugs.join(", ")}`);
      }
      if (JSON.stringify(actualPositions) !== JSON.stringify(expectedPositions)) {
        errors.push(`section positions mismatch: ${actualPositions.join(", ")}`);
      }
      // Verify no empty section bodies
      for (const s of sectionRows) {
        if (!s.body || String(s.body).trim().length === 0) {
          errors.push(`section ${s.slug}: empty body`);
        }
      }

      // Credits: exact fields
      if (creditRows.length !== 1) errors.push(`credits: ${creditRows.length} != 1`);
      const credit = creditRows[0] as any;
      if (String(credit?.contributor_slug ?? "") !== "nara-zahin") errors.push(`credit.contributor_slug: ${credit?.contributor_slug} != nara-zahin`);
      if (String(credit?.role_label ?? "") !== "initial_draft") errors.push(`credit.role_label: ${credit?.role_label} != initial_draft`);
      if (credit?.byline !== true) errors.push(`credit.byline: ${credit?.byline} != true`);

      // Visuals: exact count and fields
      if (visualRows.length !== 3) errors.push(`visuals: ${visualRows.length} != 3`);
      const expectedVisuals = [
        { role: "hero", src: "/visuals/waktu-sebenar/hero.png", provider: "magnific", is_asset_finalized: true },
        { role: "inline", src: "/visuals/waktu-sebenar/abah.png", provider: "magnific", is_asset_finalized: true },
        { role: "inline", src: "/visuals/waktu-sebenar/konflik.png", provider: "magnific", is_asset_finalized: true },
      ];
      for (let i = 0; i < expectedVisuals.length; i++) {
        const ev = expectedVisuals[i];
        const av = visualRows[i] as any;
        if (String(av?.role ?? "") !== ev.role) errors.push(`visual[${i}].role: ${av?.role} != ${ev.role}`);
        if (String(av?.src ?? "") !== ev.src) errors.push(`visual[${i}].src: ${av?.src} != ${ev.src}`);
        if (String(av?.provider ?? "") !== ev.provider) errors.push(`visual[${i}].provider: ${av?.provider} != ${ev.provider}`);
        if (av?.is_asset_finalized !== ev.is_asset_finalized) errors.push(`visual[${i}].is_asset_finalized: ${av?.is_asset_finalized} != ${ev.is_asset_finalized}`);
      }

      // Revisions: must be zero (not published yet)
      if (revisionRows.length !== 0) errors.push(`revisions: ${revisionRows.length} != 0`);

      console.log(`Work: ${work?.id} (${work?.title}) — type=${work?.type}, status=${work?.status}`);
      console.log(`Sections: ${sectionRows.length} — slugs and positions verified`);
      console.log(`Credits: ${creditRows.length} — slug=${(credit as any)?.contributor_slug}, role=${(credit as any)?.role_label}, byline=${(credit as any)?.byline}`);
      console.log(`Visuals: ${visualRows.length} — all finalized, provider=magnific`);
      console.log(`Revisions: ${revisionRows.length} — none (publication snapshots only)`);

      if (errors.length > 0) {
        throw new Error(`Verification FAILED:\n  ${errors.join("\n  ")}`);
      }
      console.log("\nAll assertions PASSED.");

      // 7. Production safety check
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
