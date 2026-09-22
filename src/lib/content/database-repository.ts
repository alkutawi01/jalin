import type { Work, WorkType, ContributorRef, GlossaryEntry, VisualRef, EditorialRevision } from "./types";
import type { ContributorMeta } from "./contributors";
import type { ContentRepository } from "./repository";
import { getDb, hasDb } from "../db";

function mapWork(row: any, credits: ContributorRef[], visuals: VisualRef[], glossary: GlossaryEntry[]): Work {
  const editorialHistory: EditorialRevision[] = Array.isArray(row.editorial_history)
    ? row.editorial_history.map((h: any) => ({
        version: String(h.version || ""),
        type: (["initial", "minor", "major"].includes(h.type) ? h.type : "minor") as "initial" | "minor" | "major",
        summary: String(h.summary || ""),
        date: String(h.date || ""),
      }))
    : [];

  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    title: String(row.title || ""),
    type: String(row.type || "cerpen") as WorkType,
    status: String(row.status || "draft") as Work["status"],
    genre: row.genre ? String(row.genre) : undefined,
    audience: row.audience ? String(row.audience) : undefined,
    dek: row.dek ? String(row.dek) : undefined,
    readingMinutes: row.reading_minutes ? Number(row.reading_minutes) : undefined,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    version: String(row.version || "v0.1"),
    body: String(row.body || ""),
    credits,
    visuals,
    glossary,
    editorialHistory,
    metadata: undefined,
    reader: undefined,
    sourceWork: undefined,
  };
}

export class DatabaseContentRepository implements ContentRepository {
  private enabled = false;
  private worksCache: Map<string, Work> = new Map();
  private contributorsCache: Map<string, ContributorMeta> = new Map();
  private loaded = false;

  constructor() {
    this.enabled = hasDb() && process.env.CONTENT_SOURCE === "database";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async init(): Promise<void> {
    if (!this.enabled || this.loaded) return;

    const db = getDb();

    const dbWorks = await db.selectFrom("works").selectAll().execute();
    const dbCredits = await db.selectFrom("credits").orderBy("sort_order", "asc").selectAll().execute();
    const dbVisuals = await db.selectFrom("visuals").orderBy("sort_order", "asc").selectAll().execute();
    const dbGlossary = await db.selectFrom("glossary_terms").orderBy("sort_order", "asc").selectAll().execute();
    const dbContributors = await db.selectFrom("contributors").selectAll().execute();

    const creditsByWork = new Map<string, ContributorRef[]>();
    for (const c of dbCredits) {
      const wid = String(c.work_id);
      if (!creditsByWork.has(wid)) creditsByWork.set(wid, []);
      creditsByWork.get(wid)!.push({
        slug: String(c.contributor_slug || c.guest_name || ""),
        role: String(c.role_label || ""),
        byline: Boolean(c.byline),
      });
    }

    const visualsByWork = new Map<string, VisualRef[]>();
    for (const v of dbVisuals) {
      const wid = String(v.work_id);
      if (!visualsByWork.has(wid)) visualsByWork.set(wid, []);
      visualsByWork.get(wid)!.push({
        role: String(v.role || "inline"),
        src: String(v.src || ""),
        alt: v.alt ? String(v.alt) : "",
        provider: v.provider ? String(v.provider) : undefined,
        creationId: v.creation_id ? String(v.creation_id) : undefined,
        anchor: v.anchor ? String(v.anchor) : undefined,
        place: (v.place === "before" ? "before" : "after") as "before" | "after",
      });
    }

    const glossaryByWork = new Map<string, GlossaryEntry[]>();
    for (const g of dbGlossary) {
      const wid = String(g.work_id);
      if (!glossaryByWork.has(wid)) glossaryByWork.set(wid, []);
      glossaryByWork.get(wid)!.push({
        term: String(g.term || ""),
        meaning: String(g.meaning || ""),
        source: String(g.source || ""),
      });
    }

    for (const row of dbWorks) {
      const wid = String(row.id);
      const work = mapWork(
        row,
        creditsByWork.get(wid) || [],
        visualsByWork.get(wid) || [],
        glossaryByWork.get(wid) || [],
      );
      this.worksCache.set(work.slug, work);
    }

    for (const c of dbContributors) {
      this.contributorsCache.set(String(c.slug), {
        name: String(c.display_name || ""),
        kind: c.kind as "human" | "virtual",
      });
    }

    this.loaded = true;
  }

  getWork(slug: string): Work | undefined {
    if (!this.enabled) return undefined;
    return this.worksCache.get(slug);
  }

  getWorks(): Work[] {
    if (!this.enabled) return [];
    return Array.from(this.worksCache.values());
  }

  getWorksByType(type: WorkType): Work[] {
    if (!this.enabled) return [];
    return Array.from(this.worksCache.values()).filter((w) => w.type === type);
  }

  getContributor(slug: string): ContributorMeta | undefined {
    if (!this.enabled) return undefined;
    return this.contributorsCache.get(slug);
  }

  getContributors(): ContributorMeta[] {
    if (!this.enabled) return [];
    return Array.from(this.contributorsCache.values());
  }
}
