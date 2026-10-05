import { getDb } from "../db";
import { isDerivativeType } from "../credit-roles";

/** One work that a check is about, with the tab of its editor page where the problem is fixed. */
export interface HealthItem {
  workId: string;
  title: string;
  message: string;
  tab: "content" | "metadata" | "credits" | "source";
  /** The button's own words when the usual one for this check does not fit this work. */
  fix?: string;
}

export interface HealthCategory {
  status: "pass" | "fail" | "warning";
  /** The same findings as plain sentences (used by the report, the audit history and the issue queue). */
  issues: string[];
  /** The same findings with the work they are about, so the dashboard can link to it. */
  items: HealthItem[];
}

export interface EditorialHealth {
  authors: HealthCategory;
  revisions: HealthCategory;
  visuals: HealthCategory;
  translations: HealthCategory;
}

interface EditorialReport {
  generatedAt: string;
  summary: {
    authors: string;
    revisions: string;
    visuals: string;
    translations: string;
  };
  issues: string[];
}

export async function getEditorialHealth(): Promise<EditorialHealth> {
  const db = getDb();
  
  const health: EditorialHealth = {
    authors: { status: "pass", issues: [], items: [] },
    revisions: { status: "pass", issues: [], items: [] },
    visuals: { status: "pass", issues: [], items: [] },
    translations: { status: "pass", issues: [], items: [] },
  };
  
  // Get published works
  const works = await db.selectFrom("works").where("status", "=", "published").selectAll().execute();
  const credits = await db.selectFrom("credits").selectAll().execute();
  const sources = await db.selectFrom("source_works").select(["work_id", "author"]).execute();
  const revisions = await db.selectFrom("work_revisions").selectAll().execute();
  const visuals = await db.selectFrom("visuals").selectAll().execute();
  
  // Check authors
  for (const work of works) {
    const workCredits = credits.filter(c => c.work_id === work.id);
    // Sinopsis and fragmen are taken from a real work published elsewhere: the author shown is the original author (the source
    // record), and Jalin's contributors are only in the editorial block. Every other type needs a public writer credit.
    const derivative = isDerivativeType(work.type);
    const hasAuthor = derivative
      ? Boolean(sources.find((s) => s.work_id === work.id)?.author?.trim())
      : workCredits.some(c => c.contributor_slug && c.is_public);
    if (!hasAuthor) {
      const message = derivative ? `${work.title || work.id} tiada pengarang asal` : `${work.title || work.id} tiada penulis awam`;
      health.authors.issues.push(message);
      health.authors.items.push({ workId: work.id, title: work.title || work.id, message, tab: derivative ? "source" : "credits", ...(derivative ? { fix: "Isi pengarang asal" } : {}) });
      health.authors.status = "fail";
    }
  }
  
  // Check revisions
  for (const work of works) {
    const workRevisions = revisions.filter(r => r.work_id === work.id);
    if (work.published_revision_id) {
      const hasRevision = workRevisions.some(r => r.id === work.published_revision_id);
      if (!hasRevision) {
        const message = `${work.title || work.id} semakan terbitan tiada`;
        health.revisions.issues.push(message);
        health.revisions.items.push({ workId: work.id, title: work.title || work.id, message, tab: "content" });
        health.revisions.status = "fail";
      }
    }
  }
  
  // Check visuals: where each picture came from (a generator or a manual upload) must be on record. This used to warn about
  // every published work that had any picture ("N visual tanpa kredit") without looking at anything: a picture has no credit
  // field, so the warning could never go away. The recorded source (provider) is what can really be missing.
  for (const work of works) {
    const withoutSource = visuals.filter(v => v.work_id === work.id && !String(v.provider ?? "").trim());
    if (withoutSource.length > 0) {
      const message = `${work.title || work.id}: ${withoutSource.length} imej tiada rekod asal`;
      health.visuals.issues.push(message);
      health.visuals.items.push({ workId: work.id, title: work.title || work.id, message, tab: "content" });
      health.visuals.status = "warning";
    }
  }
  
  // Check translations
  const translationWorks = await db.selectFrom("works").where("type", "=", "terjemahan").selectAll().execute();
  if (translationWorks.length > 0) {
    for (const w of translationWorks) {
      const message = `${w.title || w.id}: jenis lama (terjemahan)`;
      health.translations.issues.push(message);
      health.translations.items.push({ workId: w.id, title: w.title || w.id, message, tab: "metadata" });
    }
    health.translations.status = "warning";
  }
  
  return health;
}

export async function getEditorialReport(): Promise<EditorialReport> {
  const health = await getEditorialHealth();
  
  const allIssues = [
    ...health.authors.issues,
    ...health.revisions.issues,
    ...health.visuals.issues,
    ...health.translations.issues,
  ];
  
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      authors: health.authors.status,
      revisions: health.revisions.status,
      visuals: health.visuals.status,
      translations: health.translations.status,
    },
    issues: allIssues,
  };
}