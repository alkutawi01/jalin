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
  rights: HealthCategory;
}

/** A source work whose rights now forbid publication (rights status "restricted" or "rejected"). "Needs review" is not one of them. */
export const RIGHTS_BLOCKING = ["restricted", "rejected"] as const;
export const RIGHTS_STATUS_WORDS: Record<string, string> = { restricted: "terhad", rejected: "ditolak" };

interface EditorialReport {
  generatedAt: string;
  summary: {
    authors: string;
    revisions: string;
    visuals: string;
    translations: string;
    rights: string;
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
    rights: { status: "pass", issues: [], items: [] },
  };
  
  // Get published works
  const works = await db.selectFrom("works").where("status", "=", "published").selectAll().execute();
  const credits = await db.selectFrom("credits").selectAll().execute();
  const sources = await db.selectFrom("source_works").select(["work_id", "author", "rights_status"]).execute();
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
  
  // Pictures: no check. Where a picture came from is not required (a manual upload records itself; older pictures added straight
  // to a work have no source and that is fine), so it is not something the dashboard asks the administrator to fix.

  // Rights withdrawn after publication: readers keep being served the published version, so the dashboard must say so.
  for (const work of works) {
    const status = String(sources.find((s) => s.work_id === work.id)?.rights_status ?? "");
    if ((RIGHTS_BLOCKING as readonly string[]).includes(status)) {
      const message = `${work.title || work.id}: hak sumber ${RIGHTS_STATUS_WORDS[status] ?? status}, tetapi karya masih terbit`;
      health.rights.issues.push(message);
      health.rights.items.push({ workId: work.id, title: work.title || work.id, message, tab: "source", fix: "Semak hak atau arkibkan" });
    }
  }
  if (health.rights.items.length > 0) health.rights.status = "fail";

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
    ...health.rights.issues,
  ];
  
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      authors: health.authors.status,
      revisions: health.revisions.status,
      visuals: health.visuals.status,
      translations: health.translations.status,
      rights: health.rights.status,
    },
    issues: allIssues,
  };
}