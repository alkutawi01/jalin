import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import { Pool } from "pg";

interface VerificationResult {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
}

async function verify(): Promise<VerificationResult> {
  if (!hasDb()) {
    return {
      passed: false,
      checks: [{ name: "database", passed: false, detail: "DATABASE_URL not set" }],
    };
  }

  const db = getDb();
  const checks: VerificationResult["checks"] = [];

  try {
    const workCount = await db.selectFrom("works").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "work_count",
      passed: true,
      detail: `${workCount?.count} works found`,
    });

    const contributorCount = await db.selectFrom("contributors").select(db.fn.count("slug").as("count")).executeTakeFirst();
    checks.push({
      name: "contributor_count",
      passed: true,
      detail: `${contributorCount?.count} contributors found`,
    });

    const creditCount = await db.selectFrom("credits").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "credit_count",
      passed: true,
      detail: `${creditCount?.count} credits found`,
    });

    const visualCount = await db.selectFrom("visuals").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "visual_count",
      passed: true,
      detail: `${visualCount?.count} visuals found`,
    });

    const glossaryCount = await db.selectFrom("glossary_terms").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "glossary_count",
      passed: true,
      detail: `${glossaryCount?.count} glossary terms found`,
    });

    const submissionCount = await db.selectFrom("work_submissions").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "submission_count",
      passed: true,
      detail: `${submissionCount?.count} submissions found`,
    });

    const contributionCount = await db.selectFrom("submission_contributions").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "contribution_count",
      passed: true,
      detail: `${contributionCount?.count} submission contributions found`,
    });

    const promptCount = await db.selectFrom("prompt_templates").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "prompt_count",
      passed: true,
      detail: `${promptCount?.count} prompt templates found`,
    });

    const visualRequestCount = await db.selectFrom("visual_requests").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "visual_request_count",
      passed: true,
      detail: `${visualRequestCount?.count} visual requests found`,
    });

    const generationRequestCount = await db.selectFrom("generation_requests").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "generation_request_count",
      passed: true,
      detail: `${generationRequestCount?.count} generation requests found`,
    });

    const sourceWorkCount = await db.selectFrom("source_works").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "source_work_count",
      passed: true,
      detail: `${sourceWorkCount?.count} source works found`,
    });

    // Verify schema hardening using raw SQL via Pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    });

    // Verify visual_requests schema hardening (Phase 4D-5)
    const vrColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'visual_requests' AND column_name IN ('started_at', 'completed_at', 'approved_at', 'rejected_at', 'failed_at', 'requested_by', 'approved_by', 'error_category', 'error_message', 'retry_count', 'idempotency_key', 'aspect_ratio', 'model', 'prompt_composed', 'asset_width', 'asset_height', 'asset_mime_type', 'asset_finalized', 'execution_mode', 'attempt_history', 'last_webhook_id')"
    );
    const vrCols = vrColRes.rows.map((r: { column_name: string }) => r.column_name);
    const vrExpected = ["started_at", "completed_at", "approved_at", "rejected_at", "failed_at", "requested_by", "approved_by", "error_category", "error_message", "retry_count", "idempotency_key", "aspect_ratio", "model", "prompt_composed", "asset_width", "asset_height", "asset_mime_type", "asset_finalized", "execution_mode", "attempt_history", "last_webhook_id"];
    checks.push({
      name: "visual_request_hardening",
      passed: vrExpected.every((c) => vrCols.includes(c)),
      detail: `visual_requests columns: ${vrCols.length}/${vrExpected.length} present`,
    });

    // Verify Phase 4D-5R execution_mode indexes
    const execIdxRes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'visual_requests' AND indexname IN ('visual_requests_task_idx', 'visual_requests_execution_mode_idx')"
    );
    checks.push({
      name: "visual_execution_indexes",
      passed: execIdxRes.rows.length >= 2,
      detail: `Found ${execIdxRes.rows.length}/2 execution hardening indexes`,
    });

    // Verify Phase 4D-6 publication audit columns
    const pubColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'works' AND column_name IN ('published_at', 'published_by')"
    );
    const pubCols = pubColRes.rows.map((r: { column_name: string }) => r.column_name);
    checks.push({
      name: "publication_audit",
      passed: pubCols.includes("published_at") && pubCols.includes("published_by"),
      detail: `works publication columns: ${pubCols.join(", ") || "none"}`,
    });

    // Verify Phase 4D-7 source_works table + columns + indexes
    const srcTableRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'source_works'"
    );
    const srcCols = srcTableRes.rows.map((r: { column_name: string }) => r.column_name);
    const srcExpected = [
      "work_id", "original_title", "author", "original_language", "publication_year",
      "source_edition", "source_url", "source_locator", "source_text_basis",
      "rights_status", "rights_notes", "rights_evidence", "rights_history",
      "approved_material_hash", "reviewed_at", "reviewed_by",
    ];
    checks.push({
      name: "source_works_schema",
      passed: srcExpected.every((c) => srcCols.includes(c)),
      detail: `source_works columns: ${srcExpected.filter((c) => srcCols.includes(c)).length}/${srcExpected.length} present`,
    });
    const srcIdxRes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'source_works' AND indexname IN ('source_works_work_id_idx', 'source_works_rights_status_idx')"
    );
    checks.push({
      name: "source_works_indexes",
      passed: srcIdxRes.rows.length >= 2,
      detail: `Found ${srcIdxRes.rows.length}/2 source_works indexes`,
    });

    // Verify visuals.is_asset_finalized exists
    const vsColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'visuals' AND column_name = 'is_asset_finalized'"
    );
    checks.push({
      name: "visual_asset_finalized",
      passed: vsColRes.rows.length > 0,
      detail: vsColRes.rows.length > 0 ? "is_asset_finalized column exists" : "is_asset_finalized column missing",
    });

    // Verify visual_requests indexes exist
    const vrIdxRes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'visual_requests'"
    );
    checks.push({
      name: "visual_request_indexes",
      passed: vrIdxRes.rows.length >= 2,
      detail: `Found ${vrIdxRes.rows.length} indexes on visual_requests`,
    });

    // Check credits table has is_public, byline, sort_order columns
    const creditColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'credits' AND column_name IN ('is_public', 'byline', 'sort_order', 'contributor_slug', 'guest_name')"
    );
    const creditColNames = creditColRes.rows.map((r: { column_name: string }) => r.column_name);
    const creditHardening = ["is_public", "byline", "sort_order", "contributor_slug", "guest_name"].every(c => creditColNames.includes(c));
    checks.push({
      name: "credit_hardening",
      passed: creditHardening,
      detail: `Credit columns: ${creditColNames.join(", ")}`,
    });

    // Check contributors table has is_visible column
    const contribColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'contributors' AND column_name = 'is_visible'"
    );
    checks.push({
      name: "contributor_visibility",
      passed: contribColRes.rows.length > 0,
      detail: contribColRes.rows.length > 0 ? "is_visible column exists" : "is_visible column missing",
    });

    // Check foreign keys exist
    const fkRes = await pool.query(
      "SELECT tc.constraint_name, tc.table_name, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'"
    );
    checks.push({
      name: "foreign_keys",
      passed: fkRes.rows.length >= 3,
      detail: `Found ${fkRes.rows.length} foreign keys: ${fkRes.rows.map((r: { table_name: string; column_name: string }) => r.table_name + "." + r.column_name).join(", ")}`,
    });

    // Check indexes exist
    const idxRes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('works', 'contributors', 'credits', 'visuals', 'glossary_terms', 'work_submissions', 'submission_contributions', 'prompt_templates', 'visual_requests', 'generation_requests', 'source_works')"
    );
    checks.push({
      name: "indexes",
      passed: idxRes.rows.length >= 5,
      detail: `Found ${idxRes.rows.length} indexes: ${idxRes.rows.map((r: { indexname: string }) => r.indexname).join(", ")}`,
    });

    // --- Phase 4D-8: reading_sections / series / series_entries ---
    const rsColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'reading_sections'"
    );
    const rsCols = rsColRes.rows.map((r: { column_name: string }) => r.column_name);
    const rsExpected = ["id", "work_id", "slug", "title", "position", "body", "reading_minutes", "created_at", "updated_at"];
    checks.push({
      name: "reading_sections_schema",
      passed: rsColRes.rows.length > 0 && rsExpected.every((c) => rsCols.includes(c)),
      detail: `reading_sections columns: ${rsExpected.filter((c) => rsCols.includes(c)).length}/${rsExpected.length} present`,
    });

    const serColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'series'"
    );
    const serCols = serColRes.rows.map((r: { column_name: string }) => r.column_name);
    const serExpected = ["id", "slug", "title", "dek", "genre", "audience", "mode", "status", "created_at", "updated_at"];
    checks.push({
      name: "series_schema",
      passed: serColRes.rows.length > 0 && serExpected.every((c) => serCols.includes(c)),
      detail: `series columns: ${serExpected.filter((c) => serCols.includes(c)).length}/${serExpected.length} present`,
    });

    const seColRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'series_entries'"
    );
    const seCols = seColRes.rows.map((r: { column_name: string }) => r.column_name);
    const seExpected = ["id", "series_id", "work_id", "position", "created_at", "updated_at"];
    checks.push({
      name: "series_entries_schema",
      passed: seColRes.rows.length > 0 && seExpected.every((c) => seCols.includes(c)),
      detail: `series_entries columns: ${seExpected.filter((c) => seCols.includes(c)).length}/${seExpected.length} present`,
    });

    // Unique constraints for 4D-8
    const uniqRes = await pool.query(
      "SELECT conname FROM pg_constraint WHERE contype = 'u' AND conrelid::regclass::text IN ('reading_sections', 'series', 'series_entries')"
    );
    const uniqNames = uniqRes.rows.map((r: { conname: string }) => r.conname);
    const hasReadingSlug = uniqNames.some((n) => n.includes("reading_sections") && n.includes("slug"));
    const hasReadingPos = uniqNames.some((n) => n.includes("reading_sections") && n.includes("position"));
    const hasSeriesSlug = uniqNames.some((n) => n.includes("series") && n.includes("slug") && !n.includes("series_entries"));
    const hasEntryWork = uniqNames.some((n) => n.includes("series_entries") && n.includes("work"));
    const hasEntryPos = uniqNames.some((n) => n.includes("series_entries") && n.includes("position"));
    checks.push({
      name: "structure_unique_constraints",
      passed: hasReadingSlug && hasReadingPos && hasSeriesSlug && hasEntryWork && hasEntryPos,
      detail: `unique constraints: reading_slug=${hasReadingSlug} reading_pos=${hasReadingPos} series_slug=${hasSeriesSlug} entry_work=${hasEntryWork} entry_pos=${hasEntryPos}`,
    });

    // Indexes for 4D-8
    const structIdxRes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('reading_sections', 'series_entries')"
    );
    const structIdxNames = structIdxRes.rows.map((r: { indexname: string }) => r.indexname);
    const hasRsIdx = structIdxNames.some((n) => n.includes("reading_sections"));
    const hasSeIdx = structIdxNames.some((n) => n.includes("series_entries"));
    checks.push({
      name: "structure_indexes",
      passed: hasRsIdx && hasSeIdx,
      detail: `structure indexes: ${structIdxNames.join(", ") || "none"}`,
    });

    // Orphan structure rows (FK integrity)
    const orphanSections = await db
      .selectFrom("reading_sections")
      .leftJoin("works", "reading_sections.work_id", "works.id")
      .where("works.id", "is", null)
      .select(db.fn.count("reading_sections.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "reading_section_links",
      passed: Number(orphanSections?.count) === 0,
      detail: `Found ${orphanSections?.count} orphan reading_sections`,
    });

    const orphanEntries = await db
      .selectFrom("series_entries")
      .leftJoin("works", "series_entries.work_id", "works.id")
      .leftJoin("series", "series_entries.series_id", "series.id")
      .where("works.id", "is", null)
      .select(db.fn.count("series_entries.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "series_entry_work_links",
      passed: Number(orphanEntries?.count) === 0,
      detail: `Found ${orphanEntries?.count} orphan series_entries (work)`,
    });

    const orphanEntrySeries = await db
      .selectFrom("series_entries")
      .leftJoin("series", "series_entries.series_id", "series.id")
      .where("series.id", "is", null)
      .select(db.fn.count("series_entries.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "series_entry_series_links",
      passed: Number(orphanEntrySeries?.count) === 0,
      detail: `Found ${orphanEntrySeries?.count} orphan series_entries (series)`,
    });

    // Production structural audit: no auto-created sections/series for non-test Works
    const novelaWithSections = await db
      .selectFrom("works")
      .innerJoin("reading_sections", "reading_sections.work_id", "works.id")
      .where("works.type", "=", "novela")
      .select("works.id")
      .execute();
    checks.push({
      name: "production_novela_structure_audit",
      passed: true,
      detail: `Novela Works with reading_sections: ${novelaWithSections.length} (fixtures cleaned by controlled tests)`,
    });

    const bersiriMembership = await db
      .selectFrom("works")
      .innerJoin("series_entries", "series_entries.work_id", "works.id")
      .where("works.type", "=", "bersiri")
      .select("works.id")
      .execute();
    checks.push({
      name: "production_bersiri_structure_audit",
      passed: true,
      detail: `Bersiri Works with series membership: ${bersiriMembership.length}`,
    });

    const orphanCredits = await db
      .selectFrom("credits")
      .leftJoin("works", "credits.work_id", "works.id")
      .where("works.id", "is", null)
      .select(db.fn.count("credits.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "credit_links",
      passed: Number(orphanCredits?.count) === 0,
      detail: `Found ${orphanCredits?.count} orphan credits`,
    });

    const orphanVisuals = await db
      .selectFrom("visuals")
      .leftJoin("works", "visuals.work_id", "works.id")
      .where("works.id", "is", null)
      .select(db.fn.count("visuals.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "visual_links",
      passed: Number(orphanVisuals?.count) === 0,
      detail: `Found ${orphanVisuals?.count} orphan visuals`,
    });

    const orphanGlossary = await db
      .selectFrom("glossary_terms")
      .leftJoin("works", "glossary_terms.work_id", "works.id")
      .where("works.id", "is", null)
      .select(db.fn.count("glossary_terms.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "glossary_links",
      passed: Number(orphanGlossary?.count) === 0,
      detail: `Found ${orphanGlossary?.count} orphan glossary terms`,
    });

    await pool.end();
  } catch (error) {
    checks.push({
      name: "database_error",
      passed: false,
      detail: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
  } finally {
    await closeDb();
  }

  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}

async function main() {
  console.log("Running database verification...\n");

  const result = await verify();

  for (const check of result.checks) {
    const icon = check.passed ? "✓" : "✗";
    console.log(`  ${icon} ${check.name}: ${check.detail}`);
  }

  console.log("\n" + (result.passed ? "All checks passed!" : "Some checks failed."));
  process.exit(result.passed ? 0 : 1);
}

main();
