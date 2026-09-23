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

    // Verify schema hardening using raw SQL via Pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
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
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('works', 'contributors', 'credits', 'visuals', 'glossary_terms')"
    );
    checks.push({
      name: "indexes",
      passed: idxRes.rows.length >= 5,
      detail: `Found ${idxRes.rows.length} indexes: ${idxRes.rows.map((r: { indexname: string }) => r.indexname).join(", ")}`,
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
