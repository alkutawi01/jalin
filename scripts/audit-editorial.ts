import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";

interface AuditResult {
  category: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
  details?: string[];
}

const results: AuditResult[] = [];

function addResult(category: string, status: "PASS" | "FAIL" | "WARNING", message: string, details?: string[]) {
  results.push({ category, status, message, details });
}

async function main() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = getDb();
  
  const isJson = process.argv.includes("--json");
  
  // 1. Author Identity Check
  const works = await db.selectFrom("works").selectAll().execute();
  const credits = await db.selectFrom("credits").selectAll().execute();
  const contributors = await db.selectFrom("contributors").selectAll().execute();
  
  const publishedWorks = works.filter(w => w.status === "published");
  const authorDetails: string[] = [];
  
  for (const work of publishedWorks) {
    const workCredits = credits.filter(c => c.work_id === work.id);
    const hasAuthor = workCredits.some(c => c.contributor_slug && c.is_public);
    
    if (hasAuthor) {
      authorDetails.push(`✅ ${work.id} has public author`);
    } else {
      authorDetails.push(`❌ ${work.id} missing public author`);
    }
  }
  
  const authorFails = authorDetails.filter(d => d.startsWith("❌")).length;
  addResult("Authors", authorFails > 0 ? "FAIL" : "PASS", 
    authorFails > 0 ? `${authorFails} works missing authors` : "All published works have authors",
    authorDetails);
  
  // 2. Revision Integrity Check
  const revisions = await db.selectFrom("work_revisions").selectAll().execute();
  const revisionDetails: string[] = [];
  
  for (const work of publishedWorks) {
    const workRevisions = revisions.filter(r => r.work_id === work.id);
    
    if (work.published_revision_id) {
      const hasRevision = workRevisions.some(r => r.id === work.published_revision_id);
      if (hasRevision) {
        revisionDetails.push(`✅ ${work.id} has valid published revision`);
      } else {
        revisionDetails.push(`❌ ${work.id} published_revision_id points to missing revision`);
      }
    } else {
      revisionDetails.push(`⚠️ ${work.id} has no published_revision_id`);
    }
  }
  
  const revisionFails = revisionDetails.filter(d => d.startsWith("❌")).length;
  addResult("Revisions", revisionFails > 0 ? "FAIL" : "PASS",
    revisionFails > 0 ? `${revisionFails} revision issues` : "All revisions intact",
    revisionDetails);
  
  // 3. Visual Credit Check
  const visuals = await db.selectFrom("visuals").selectAll().execute();
  const visualDetails: string[] = [];
  
  for (const work of publishedWorks) {
    const workVisuals = visuals.filter(v => v.work_id === work.id);
    if (workVisuals.length > 0) {
      visualDetails.push(`⚠️ ${work.id}: ${workVisuals.length} visuals without credit field`);
    }
  }
  
  addResult("Visual credits", visualDetails.length > 0 ? "WARNING" : "PASS",
    visualDetails.length > 0 ? `${visualDetails.length} works need visual credits` : "All visuals have credits",
    visualDetails);
  
  // 4. Translation Metadata Check
  const translationWorks = works.filter(w => w.type === "terjemahan");
  const translationDetails: string[] = [];
  
  if (translationWorks.length > 0) {
    for (const w of translationWorks) {
      translationDetails.push(`⚠️ ${w.id}: ${w.title} (type=terjemahan)`);
    }
  }
  
  addResult("Translations", translationDetails.length > 0 ? "WARNING" : "PASS",
    translationDetails.length > 0 ? `${translationWorks.length} works with legacy type` : "No translation works",
    translationDetails);
  
  // Output
  if (isJson) {
    const jsonOutput: Record<string, string> = {};
    for (const r of results) {
      jsonOutput[r.category.toLowerCase()] = r.status.toLowerCase();
    }
    console.log(JSON.stringify(jsonOutput, null, 2));
  } else {
    console.log("=== EDITORIAL AUDIT REPORT ===\n");
    
    for (const r of results) {
      const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
      console.log(`${icon} ${r.category}: ${r.message}`);
      
      if (r.details && r.details.length > 0) {
        for (const d of r.details) {
          console.log(`   ${d}`);
        }
      }
      console.log();
    }
    
    const pass = results.filter(r => r.status === "PASS").length;
    const fail = results.filter(r => r.status === "FAIL").length;
    const warning = results.filter(r => r.status === "WARNING").length;
    
    console.log("=== SUMMARY ===");
    console.log(`PASS: ${pass}`);
    console.log(`FAIL: ${fail}`);
    console.log(`WARNING: ${warning}`);
  }
  
  await closeDb();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});