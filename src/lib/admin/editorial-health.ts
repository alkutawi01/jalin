import { getDb } from "../db";

interface HealthCategory {
  status: "pass" | "fail" | "warning";
  issues: string[];
}

interface EditorialHealth {
  authors: HealthCategory;
  revisions: HealthCategory;
  visuals: HealthCategory;
  translations: HealthCategory;
}

export async function getEditorialHealth(): Promise<EditorialHealth> {
  const db = getDb();
  
  const health: EditorialHealth = {
    authors: { status: "pass", issues: [] },
    revisions: { status: "pass", issues: [] },
    visuals: { status: "pass", issues: [] },
    translations: { status: "pass", issues: [] },
  };
  
  // Get published works
  const works = await db.selectFrom("works").where("status", "=", "published").selectAll().execute();
  const credits = await db.selectFrom("credits").selectAll().execute();
  const revisions = await db.selectFrom("work_revisions").selectAll().execute();
  const visuals = await db.selectFrom("visuals").selectAll().execute();
  
  // Check authors
  for (const work of works) {
    const workCredits = credits.filter(c => c.work_id === work.id);
    const hasAuthor = workCredits.some(c => c.contributor_slug && c.is_public);
    if (!hasAuthor) {
      health.authors.issues.push(`${work.title || work.id} missing public author`);
      health.authors.status = "fail";
    }
  }
  
  // Check revisions
  for (const work of works) {
    const workRevisions = revisions.filter(r => r.work_id === work.id);
    if (work.published_revision_id) {
      const hasRevision = workRevisions.some(r => r.id === work.published_revision_id);
      if (!hasRevision) {
        health.revisions.issues.push(`${work.title || work.id} published revision missing`);
        health.revisions.status = "fail";
      }
    }
  }
  
  // Check visuals
  for (const work of works) {
    const workVisuals = visuals.filter(v => v.work_id === work.id);
    if (workVisuals.length > 0) {
      health.visuals.issues.push(`${work.title || work.id}: ${workVisuals.length} visuals without credit`);
      health.visuals.status = "warning";
    }
  }
  
  // Check translations
  const translationWorks = await db.selectFrom("works").where("type", "=", "terjemahan").selectAll().execute();
  if (translationWorks.length > 0) {
    for (const w of translationWorks) {
      health.translations.issues.push(`${w.title || w.id}: legacy type=terjemahan`);
    }
    health.translations.status = "warning";
  }
  
  return health;
}