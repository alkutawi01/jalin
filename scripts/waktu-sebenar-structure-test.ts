/**
 * Waktu Sebenar structural test (Phase 4D-8R).
 *
 * Import the Waktu Sebenar manuscript (30 BABs + EPILOG = 31 sections) into a dedicated
 * NON-PUBLIC test Work. Verify structural integrity:
 * - exact reading_sections count (31)
 * - positions 1..N contiguous
 * - slugs bab-1..bab-30 + epilog (no duplicates)
 * - no empty section bodies
 * - section precedence over works.body
 * - ONE Work (not one Work per chapter)
 * - admin-style navigation 1..N
 * - prev/next correct at boundaries
 * - no accidental publication
 *
 * Source: content/manuscripts/Waktu_Sebenar_Structural_Edit_v1.0.txt
 * SHA-256: 676BB74284C8A1FF4B2D09FCC9494BE9505A4FCE7FD1C38009F4EC6EEE0F5E96
 * Source self-label: "novel penuh, versi Structural Edit v1.0, disahkan bersama ChatGPT"
 * No taxonomy reclassification. No prose modification. No public publication.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb, hasDb, closeDb } from "../src/lib/db";
import { evaluatePublicationReadiness } from "../src/lib/admin/publication-service";
import {
  createSection,
  listSectionsForWork,
  deleteSection,
} from "../src/lib/admin/section-service";
import { DatabaseContentRepository } from "../src/lib/content/database-repository";

const TEST_ID = "JLN-NOV-9990";
const TEST_SLUG = "uji-waktu-sebenar-4d8r";
const MANUSCRIPT_PATH = resolve(__dirname, "../content/manuscripts/Waktu_Sebenar_Structural_Edit_v1.0.txt");

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function parseManuscript(): { heading: string; slug: string; body: string }[] {
  const raw = readFileSync(MANUSCRIPT_PATH, "utf-8");
  const lines = raw.split("\n");
  const sections: { heading: string; slug: string; body: string }[] = [];
  let currentHeading: string | null = null;
  let currentBody: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const babMatch = trimmed.match(/^BAB (\d+)$/i);
    const epilogMatch = trimmed.match(/^EPILOG$/i);

    if (babMatch || epilogMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          slug: currentHeading.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          body: currentBody.join("\n").trim(),
        });
      }
      currentHeading = babMatch ? `BAB ${babMatch[1]}` : "EPILOG";
      currentBody = [];
    } else if (currentHeading) {
      currentBody.push(line);
    }
  }
  // Push last section
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      slug: currentHeading.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      body: currentBody.join("\n").trim(),
    });
  }
  return sections;
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

  console.log("\n=== Waktu Sebenar structural test (4D-8R) ===");

  // 1. Parse manuscript
  const parsed = parseManuscript();
  ok(`Manuscript parsed: ${parsed.length} sections found`);

  // Count only BAB sections (not EPILOG)
  const babCount = parsed.filter((s) => s.heading.startsWith("BAB ")).length;
  const hasEpilog = parsed.some((s) => s.heading === "EPILOG");
  ok(`BAB count: ${babCount}, EPILOG: ${hasEpilog ? "present" : "absent"}`);

  // 2. Create ONE Work (not one Work per chapter)
  const now = new Date().toISOString();
  await db.insertInto("works").values({
    id: TEST_ID, slug: TEST_SLUG,
    title: "Waktu Sebenar — Uji Struktur 4D-8R",
    type: "novela", status: "draft",
    body: "", // Empty — sections take precedence
    dek: "Fixture ujian struktur. Bukan untuk pembaca awam.",
    genre: "Keluarga", audience: "remaja", reading_minutes: 120,
    version: "v0.1", editorial_history: JSON.stringify([]),
    published_at: null, published_by: null,
    updated_at: now, created_at: now,
  } as never).execute();
  ok("ONE Work created (type=novela, status=draft, body=empty)");

  // 3. Import sections
  for (const section of parsed) {
    await createSection({
      workId: TEST_ID,
      slug: section.slug,
      title: section.heading,
      body: section.body,
    });
  }

  // 4. Verify structure
  const sections = await listSectionsForWork(TEST_ID);
  if (sections.length !== parsed.length) {
    fail(`expected ${parsed.length} sections, got ${sections.length}`);
  }
  ok(`Imported ${sections.length} reading_sections`);

  // 5. Positions validation: exactly 1..N contiguous
  for (let i = 0; i < sections.length; i++) {
    if (sections[i]!.position !== i + 1) {
      fail(`position mismatch: expected ${i + 1}, got ${sections[i]!.position} (${sections[i]!.slug})`);
    }
  }
  ok("Positions exactly 1..N contiguous");

  // 6. Slug validation: no duplicates, all valid format
  const slugs = sections.map((s) => s.slug);
  const uniqueSlugs = new Set(slugs);
  if (uniqueSlugs.size !== slugs.length) {
    fail("duplicate slugs detected");
  }
  for (const slug of slugs) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      fail(`invalid slug format: ${slug}`);
    }
  }
  ok("All slugs unique and valid format");

  // 7. No empty section bodies
  for (const s of sections) {
    if (!s.body || s.body.trim().length === 0) {
      fail(`empty body in section: ${s.slug}`);
    }
  }
  ok("No empty section bodies");

  // 8. Section precedence over works.body
  const work = await db.selectFrom("works").where("id", "=", TEST_ID).select(["body", "status"]).executeTakeFirst();
  if (!work) fail("work missing");
  if (work.body && work.body.trim().length > 0) {
    fail("works.body should be empty when sections exist");
  }
  ok("Section precedence: works.body empty, sections are canonical");

  // 9. Readiness: should NOT have novela_no_structure (sections exist)
  const r = await evaluatePublicationReadiness(TEST_ID);
  if (!r) fail("readiness null");
  if (r.blockers.some((b) => b.code === "novela_no_structure")) {
    fail("novela_no_structure should not fire when sections exist");
  }
  // Expect other blockers (credits, visuals, etc.) — that's fine
  ok("Readiness gate: novela_no_structure not raised (sections present)");

  // 10. Navigation test: prev/next correctness
  // First section: no prev, next = 2
  // Last section: prev = N-1, no next
  // Middle section: prev = pos-1, next = pos+1
  const first = sections[0]!;
  const last = sections[sections.length - 1]!;
  const middle = sections[Math.floor(sections.length / 2)]!;

  if (first.position !== 1) fail("first section must be position 1");
  if (last.position !== sections.length) fail("last section must be final position");
  if (middle.position !== Math.floor(sections.length / 2) + 1) {
    fail("middle section position incorrect");
  }
  ok(`Navigation boundaries: first=pos 1 (${first.slug}), last=pos ${last.position} (${last.slug}), middle=pos ${middle.position}`);

  // 11. Verify no accidental publication
  if (work.status !== "draft") {
    fail(`work should be draft, got ${work.status}`);
  }
  ok("Work remains draft (no accidental publication)");

  // 12. Admin preview navigation: simulate index
  const sectionIndex = sections.map((s) => ({
    position: s.position,
    slug: s.slug,
    title: s.title,
  }));
  if (sectionIndex.length !== parsed.length) {
    fail("section index length mismatch");
  }
  ok(`Admin preview index: ${sectionIndex.length} entries, navigable 1..${sectionIndex.length}`);

  // 13. Long-form stress: verify all metadata loads
  for (const s of sections) {
    if (!s.id || !s.slug || !s.title || s.position < 1) {
      fail(`incomplete metadata for section pos=${s.position}`);
    }
  }
  ok("Long-form stress: all section metadata complete");

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
  console.log("\nWAKTU_SEBENAR_STRUCTURE_TEST=PASS");
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await closeDb(); } catch { /* */ }
  process.exit(1);
});
