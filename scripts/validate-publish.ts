import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";

interface ValidationResult {
  category: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
}

async function validateWorkForPublish(workId: string): Promise<ValidationResult[]> {
  const db = getDb();
  const results: ValidationResult[] = [];
  
  // Get work
  const work = await db.selectFrom("works").where("id", "=", workId).selectAll().executeTakeFirst();
  if (!work) {
    results.push({ category: "existence", status: "FAIL", message: `Work ${workId} not found` });
    return results;
  }
  
  // Check body - novela can use reading_sections instead
  if (work.type === "novela") {
    // For novela, check if reading_sections exist
    const sections = await db.selectFrom("reading_sections").where("work_id", "=", workId).selectAll().execute();
    if (sections.length > 0) {
      results.push({ category: "content", status: "PASS", message: `Novela has ${sections.length} reading sections` });
    } else if (!work.body || work.body.trim().length === 0) {
      results.push({ category: "content", status: "FAIL", message: "Novela has no body or reading sections" });
    } else {
      results.push({ category: "content", status: "PASS", message: "Work has body content" });
    }
  } else {
    // For other types, check body
    if (!work.body || work.body.trim().length === 0) {
      results.push({ category: "content", status: "FAIL", message: "Work has empty body" });
    } else {
      results.push({ category: "content", status: "PASS", message: "Work has body content" });
    }
  }
  
  // Check author
  const credits = await db.selectFrom("credits").where("work_id", "=", workId).selectAll().execute();
  const hasAuthor = credits.some(c => c.contributor_slug && c.is_public);
  if (hasAuthor) {
    results.push({ category: "authors", status: "PASS", message: "Work has public author" });
  } else {
    results.push({ category: "authors", status: "FAIL", message: "Work missing public author" });
  }
  
  // Check revision
  const revisions = await db.selectFrom("work_revisions").where("work_id", "=", workId).selectAll().execute();
  if (work.published_revision_id) {
    const hasRevision = revisions.some(r => r.id === work.published_revision_id);
    if (hasRevision) {
      results.push({ category: "revisions", status: "PASS", message: "Published revision exists" });
    } else {
      results.push({ category: "revisions", status: "FAIL", message: "Published revision ID points to missing revision" });
    }
  } else {
    results.push({ category: "revisions", status: "WARNING", message: "No published revision ID" });
  }
  
  // Check visuals
  const visuals = await db.selectFrom("visuals").where("work_id", "=", workId).selectAll().execute();
  if (visuals.length > 0) {
    results.push({ category: "visuals", status: "WARNING", message: `${visuals.length} visuals without credit field` });
  }
  
  return results;
}

async function main() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  
  const workId = process.argv[2];
  if (!workId) {
    console.error("Usage: npx tsx validate-publish.ts <workId>");
    process.exit(1);
  }
  
  console.log(`=== PUBLISH VALIDATION: ${workId} ===\n`);
  
  const results = await validateWorkForPublish(workId);
  
  let hasFail = false;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
    console.log(`${icon} ${r.category}: ${r.message}`);
    if (r.status === "FAIL") hasFail = true;
  }
  
  console.log(`\n=== RESULT: ${hasFail ? "BLOCKED" : "OK"} ===`);
  
  await closeDb();
  process.exit(hasFail ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});