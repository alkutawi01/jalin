import { getDb, hasDb, closeDb } from "../src/lib/db";

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
      passed: Number(workCount?.count) === 3,
      detail: `Expected 3, got ${workCount?.count}`,
    });

    const contributorCount = await db.selectFrom("contributors").select(db.fn.count("slug").as("count")).executeTakeFirst();
    checks.push({
      name: "contributor_count",
      passed: Number(contributorCount?.count) === 5,
      detail: `Expected 5, got ${contributorCount?.count}`,
    });

    const creditCount = await db.selectFrom("credits").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "credit_count",
      passed: Number(creditCount?.count) === 9,
      detail: `Expected 9, got ${creditCount?.count}`,
    });

    const visualCount = await db.selectFrom("visuals").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "visual_count",
      passed: Number(visualCount?.count) === 8,
      detail: `Expected 8, got ${visualCount?.count}`,
    });

    const glossaryCount = await db.selectFrom("glossary_terms").select(db.fn.count("id").as("count")).executeTakeFirst();
    checks.push({
      name: "glossary_count",
      passed: Number(glossaryCount?.count) === 17,
      detail: `Expected 17, got ${glossaryCount?.count}`,
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

    const worksWithCredits = await db
      .selectFrom("works")
      .innerJoin("credits", "works.id", "credits.work_id")
      .select("works.id")
      .distinct()
      .select(db.fn.count("works.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "all_works_have_credits",
      passed: Number(worksWithCredits?.count) === Number(workCount?.count),
      detail: `Expected ${workCount?.count} works with credits, got ${worksWithCredits?.count}`,
    });

    const worksWithVisuals = await db
      .selectFrom("works")
      .innerJoin("visuals", "works.id", "visuals.work_id")
      .select("works.id")
      .distinct()
      .select(db.fn.count("works.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "all_works_have_visuals",
      passed: Number(worksWithVisuals?.count) === Number(workCount?.count),
      detail: `Expected ${workCount?.count} works with visuals, got ${worksWithVisuals?.count}`,
    });

    const worksWithGlossary = await db
      .selectFrom("works")
      .innerJoin("glossary_terms", "works.id", "glossary_terms.work_id")
      .select("works.id")
      .distinct()
      .select(db.fn.count("works.id").as("count"))
      .executeTakeFirst();
    checks.push({
      name: "all_works_have_glossary",
      passed: Number(worksWithGlossary?.count) === Number(workCount?.count),
      detail: `Expected ${workCount?.count} works with glossary, got ${worksWithGlossary?.count}`,
    });
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
