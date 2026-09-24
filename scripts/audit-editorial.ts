import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";

interface AuditResult {
  category: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
}

const results: AuditResult[] = [];

function addResult(category: string, status: "PASS" | "FAIL" | "WARNING", message: string) {
  results.push({ category, status, message });
}

async function main() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = getDb();
  
  console.log("=== EDITORIAL AUDIT REPORT ===\n");
  
  // 1. Author Identity Check
  const works = await db.selectFrom("works").selectAll().execute();
  const credits = await db.selectFrom("credits").selectAll().execute();
  const contributors = await db.selectFrom("contributors").selectAll().execute();
  
  const publishedWorks = works.filter(w => w.status === "published");
  
  for (const work of publishedWorks) {
    const workCredits = credits.filter(c => c.work_id === work.id);
    const hasAuthor = workCredits.some(c => c.contributor_slug && c.is_public);
    
    if (hasAuthor) {
      addResult("Authors", "PASS", `${work.id} has public author`);
    } else {
      addResult("Authors", "FAIL", `${work.id} missing public author`);
    }
  }
  
  // 2. Revision Integrity Check
  const revisions = await db.selectFrom("work_revisions").selectAll().execute();
  
  for (const work of publishedWorks) {
    const workRevisions = revisions.filter(r => r.work_id === work.id);
    
    if (work.published_revision_id) {
      const hasRevision = workRevisions.some(r => r.id === work.published_revision_id);
      if (hasRevision) {
        addResult("Revisions", "PASS", `${work.id} has valid published revision`);
      } else {
        addResult("Revisions", "FAIL", `${work.id} published_revision_id points to missing revision`);
      }
    } else {
      addResult("Revisions", "WARNING", `${work.id} has no published_revision_id`);
    }
  }
  
  // 3. Visual Credit Check
  const visuals = await db.selectFrom("visuals").selectAll().execute();
  
  for (const work of publishedWorks) {
    const workVisuals = visuals.filter(v => v.work_id === work.id);
    if (workVisuals.length > 0) {
      addResult("Visual credits", "WARNING", `${work.id} has ${workVisuals.length} visuals without credit field`);
    }
  }
  
  // 4. Translation Metadata Check
  const translationWorks = works.filter(w => w.type === "terjemahan");
  if (translationWorks.length === 0) {
    addResult("Translations", "PASS", "No translation works found");
  } else {
    addResult("Translations", "WARNING", `${translationWorks.length} works with type=terjemahan`);
  }
  
  // Print results
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
    console.log(`${icon} ${r.category}: ${r.message}`);
  }
  
  // Summary
  const pass = results.filter(r => r.status === "PASS").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  const warning = results.filter(r => r.status === "WARNING").length;
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log(`WARNING: ${warning}`);
  
  await closeDb();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});