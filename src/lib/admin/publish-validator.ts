import { getDb } from "../db";

interface ValidationResult {
  category: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
}

export async function validateWorkForPublish(workId: string): Promise<ValidationResult[]> {
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