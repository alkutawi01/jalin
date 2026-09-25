import type { Work, WorkType, ContributorRef, GlossaryEntry, VisualRef, EditorialRevision, SourceWorkRef, ReadingSection, SeriesMeta, SeriesEpisodeRef } from "./types";
import type { ContributorMeta } from "./contributors";
import type { ContentRepository } from "./repository";
import { getDb, hasDb } from "../db";

/** Reader-safe public source provenance — never includes rights_notes/evidence/history/reviewed_by/reviewed_at/source_url. */
function mapPublicSourceWork(row: any): SourceWorkRef | undefined {
  if (!row) return undefined;
  const title = row.original_title ? String(row.original_title) : "";
  const author = row.author ? String(row.author) : "";
  if (!title && !author) return undefined;
  const status = String(row.rights_status || "");
  const rightsLabel =
    status === "public_domain"
      ? "Domain awam"
      : status === "licensed"
        ? "Berlesen"
        : status === "permission_obtained"
          ? "Kebenaran diperoleh"
          : undefined;
  return {
    title,
    author: author || undefined,
    language: row.original_language ? String(row.original_language) : undefined,
    rightsStatus: rightsLabel,
  };
}

function mapWork(
  row: any,
  credits: ContributorRef[],
  visuals: VisualRef[],
  glossary: GlossaryEntry[],
  sourceWork?: SourceWorkRef,
  sections?: ReadingSection[],
  series?: SeriesMeta
): Work {
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
    versionLabel: row.version_label ? String(row.version_label) : null,
    revisionCount: row.revision_count ? Number(row.revision_count) : 0,
    body: String(row.body || ""),
    credits,
    visuals,
    glossary,
    editorialHistory,
    metadata: undefined,
    reader: undefined,
    sourceWork,
    sections: sections && sections.length > 0 ? sections : undefined,
    series,
  };
}

export class DatabaseContentRepository implements ContentRepository {
  private enabled = false;
  private worksCache: Map<string, Work> = new Map();
  private worksByIdCache: Map<string, Work> = new Map();
  private contributorsCache: Map<string, ContributorMeta> = new Map();
  private sectionsByWorkId: Map<string, ReadingSection[]> = new Map();
  private seriesCache: Map<string, SeriesMeta> = new Map();
  private seriesBySlug: Map<string, SeriesMeta> = new Map();
  private seriesEpisodes: Map<string, SeriesEpisodeRef[]> = new Map();
  private workIdBySlug: Map<string, string> = new Map();
  private seriesIdByWorkId: Map<string, string> = new Map();
  private revisionSnapshots: Map<string, Work> = new Map();
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
    const dbSources = await db.selectFrom("source_works").selectAll().execute();
    const dbSections = await db.selectFrom("reading_sections").orderBy("position", "asc").selectAll().execute();
    const dbSeries = await db.selectFrom("series").selectAll().execute();
    const dbEntries = await db.selectFrom("series_entries").orderBy("position", "asc").selectAll().execute();

    // Load published revision snapshots for published works
    const dbRevisions = await db.selectFrom("work_revisions").orderBy("revision_no", "desc").selectAll().execute();
    for (const rev of dbRevisions) {
      const workId = String(rev.work_id);
      if (!this.revisionSnapshots.has(workId)) {
        const snapshot = typeof rev.snapshot === "string" ? JSON.parse(rev.snapshot) : rev.snapshot;
        this.revisionSnapshots.set(workId, snapshot);
      }
    }

    const sourcesByWork = new Map<string, SourceWorkRef>();
    for (const s of dbSources) {
      const mapped = mapPublicSourceWork(s);
      if (mapped) sourcesByWork.set(String(s.work_id), mapped);
    }

    const creditsByWork = new Map<string, ContributorRef[]>();
    for (const c of dbCredits) {
      const wid = String(c.work_id);
      if (!creditsByWork.has(wid)) creditsByWork.set(wid, []);

      // Only include public credits in the public content repository
      if (c.is_public) {
        // Discriminated identity: contributor OR guest, never both
        const slug = c.contributor_slug || `guest:${c.guest_name}`;
        creditsByWork.get(wid)!.push({
          slug: String(slug || ""),
          role: String(c.role_label || ""),
          byline: Boolean(c.byline),
        });
      }
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

    for (const s of dbSections) {
      const wid = String(s.work_id);
      if (!this.sectionsByWorkId.has(wid)) this.sectionsByWorkId.set(wid, []);
      this.sectionsByWorkId.get(wid)!.push({
        slug: String(s.slug || ""),
        title: s.title ? String(s.title) : undefined,
        body: String(s.body || ""),
        position: Number(s.position || 0),
        readingMinutes: s.reading_minutes ? Number(s.reading_minutes) : undefined,
      });
    }

    const worksById = new Map<string, any>();
    for (const row of dbWorks) {
      worksById.set(String(row.id), row);
    }

    for (const se of dbSeries) {
      const meta: SeriesMeta = {
        id: String(se.id),
        slug: String(se.slug),
        title: String(se.title),
        dek: se.dek ? String(se.dek) : undefined,
        genre: se.genre ? String(se.genre) : undefined,
        audience: se.audience ? String(se.audience) : undefined,
        mode: (String(se.mode) === "anthology" ? "anthology" : "continuous"),
        status: (String(se.status) === "completed" ? "completed" : "ongoing"),
      };
      this.seriesCache.set(meta.id, meta);
      this.seriesBySlug.set(meta.slug, meta);
    }

    const entriesBySeries = new Map<string, typeof dbEntries>();
    for (const e of dbEntries) {
      const sid = String(e.series_id);
      if (!entriesBySeries.has(sid)) entriesBySeries.set(sid, []);
      entriesBySeries.get(sid)!.push(e);
      this.seriesIdByWorkId.set(String(e.work_id), sid);
    }

    // Public repository: only published Works are discoverable.
    // Public repository: only published Works are discoverable.
    // For published works, use the published revision snapshot instead of working copy.
    for (const row of dbWorks) {
      if (String(row.status || "") !== "published") continue;
      const wid = String(row.id);
      const seriesMeta = this.seriesIdByWorkId.has(wid)
        ? this.seriesCache.get(this.seriesIdByWorkId.get(wid)!)
        : undefined;

      // Check if we have a published revision snapshot for this work
      const snapshot = this.revisionSnapshots.get(wid);
      if (snapshot) {
        // Use the published revision snapshot for public view
        const revisionWork = this.buildSnapshotWork(snapshot, wid);
        if (revisionWork) {
          this.worksCache.set(revisionWork.slug, revisionWork);
          this.worksByIdCache.set(wid, revisionWork);
          this.workIdBySlug.set(revisionWork.slug, wid);
        }
      } else {
        // Fallback to working copy for published works without revision
        const work = mapWork(
          row,
          creditsByWork.get(wid) || [],
          visualsByWork.get(wid) || [],
          glossaryByWork.get(wid) || [],
          sourcesByWork.get(wid),
          this.sectionsByWorkId.get(wid),
          seriesMeta
        );
        this.worksCache.set(work.slug, work);
        this.worksByIdCache.set(wid, work);
        this.workIdBySlug.set(work.slug, wid);
      }
    }

    // Build public series episode lists with eligibility rules.
    for (const [seriesId, entries] of entriesBySeries) {
      const seriesMeta = this.seriesCache.get(seriesId);
      if (!seriesMeta) continue;
      const episodes: SeriesEpisodeRef[] = [];
      let publicEligible = false;

      if (seriesMeta.mode === "continuous") {
        // Contiguous published prefix from position 1 only.
        for (const entry of entries) {
          const row = worksById.get(String(entry.work_id));
          if (!row || String(row.status) !== "published") break;
          episodes.push({
            position: entry.position,
            slug: String(row.slug),
            title: String(row.title),
            dek: row.dek ? String(row.dek) : undefined,
            publishedAt: row.published_at
              ? new Date(row.published_at).toISOString()
              : undefined,
            readingMinutes: row.reading_minutes ? Number(row.reading_minutes) : undefined,
          });
          publicEligible = true;
        }
      } else {
        // Anthology: all published episodes independently visible.
        for (const entry of entries) {
          const row = worksById.get(String(entry.work_id));
          if (!row || String(row.status) !== "published") continue;
          episodes.push({
            position: entry.position,
            slug: String(row.slug),
            title: String(row.title),
            dek: row.dek ? String(row.dek) : undefined,
            publishedAt: row.published_at
              ? new Date(row.published_at).toISOString()
              : undefined,
            readingMinutes: row.reading_minutes ? Number(row.reading_minutes) : undefined,
          });
          publicEligible = true;
        }
      }

      if (publicEligible) {
        this.seriesEpisodes.set(seriesId, episodes);
      } else {
        // Zero publicly eligible episodes → not discoverable.
        this.seriesCache.delete(seriesId);
        this.seriesBySlug.delete(seriesMeta.slug);
      }
    }

    // Remove published episode Works that are not publicly eligible via their Series.
    // (They remain reachable only if not type=bersiri; bersiri episodes require Series context.)
    for (const [slug, work] of Array.from(this.worksCache.entries())) {
      if (work.type !== "bersiri") continue;
      const sid = this.seriesIdByWorkId.get(work.id);
      if (!sid || !this.seriesCache.has(sid)) {
        this.worksCache.delete(slug);
        this.workIdBySlug.delete(slug);
        this.worksByIdCache.delete(work.id);
      }
    }

    for (const c of dbContributors) {
      // Only include visible contributors in the public content repository
      if (c.is_visible) {
        this.contributorsCache.set(String(c.slug), {
          name: String(c.display_name || ""),
          kind: c.kind as "human" | "virtual",
        });
      }
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

  getReadingSections(workId: string): ReadingSection[] {
    if (!this.enabled) return [];
    return this.sectionsByWorkId.get(workId) ?? [];
  }

  getPublishedSeries(): SeriesMeta[] {
    if (!this.enabled) return [];
    return Array.from(this.seriesCache.values());
  }

  getSeriesBySlug(slug: string): SeriesMeta | undefined {
    if (!this.enabled) return undefined;
    return this.seriesBySlug.get(slug);
  }

  getPublishedSeriesEpisodes(seriesId: string): SeriesEpisodeRef[] {
    if (!this.enabled) return [];
    return this.seriesEpisodes.get(seriesId) ?? [];
  }

  getEpisodeBySeriesAndSlug(seriesSlug: string, episodeSlug: string): Work | undefined {
    if (!this.enabled) return undefined;
    const series = this.seriesBySlug.get(seriesSlug);
    if (!series) return undefined;
    const episodes = this.seriesEpisodes.get(series.id) ?? [];
    const match = episodes.find((e) => e.slug === episodeSlug);
    if (!match) return undefined;
    return this.worksCache.get(match.slug);
  }

  private buildSnapshotWork(snapshot: any, workId: string): Work | undefined {
    if (!snapshot) return undefined;
    try {
      const work: Work = {
        id: snapshot.id,
        slug: snapshot.slug,
        title: snapshot.title,
        type: snapshot.type,
        status: "published",
        genre: snapshot.genre,
        audience: snapshot.audience,
        dek: snapshot.dek,
        readingMinutes: snapshot.readingMinutes,
        version: snapshot.version,
        versionLabel: snapshot.versionLabel,
        revisionCount: snapshot.revisionCount,
        publishedAt: snapshot.publishedAt,
        publishedBy: snapshot.publishedBy,
        firstPublishedAt: snapshot.firstPublishedAt,
        publishedRevisionId: snapshot.publishedRevisionId,
        body: snapshot.body,
        credits: (snapshot.credits || []).filter((c: any) => c.is_public !== false).map((c: any) => ({
          slug: String(c.contributor_slug || (c.guest_name ? `guest:${c.guest_name}` : c.slug || "")),
          role: String(c.role_label || c.role || ""),
          byline: Boolean(c.byline),
        })),
        visuals: (snapshot.visuals || []).map((v: any) => ({
          role: String(v.role || "inline"),
          src: String(v.src || ""),
          alt: String(v.alt || ""),
          provider: v.provider ? String(v.provider) : undefined,
          creationId: v.creation_id ? String(v.creation_id) : v.creationId ? String(v.creationId) : undefined,
          anchor: v.anchor ? String(v.anchor) : undefined,
          place: v.place === "before" ? "before" : "after",
        })),
        glossary: (snapshot.glossary || []).map((g: any) => ({ term: String(g.term || ""), meaning: String(g.meaning || ""), source: String(g.source || "") })),
        editorialHistory: snapshot.editorialHistory || [],
        metadata: snapshot.metadata,
        reader: snapshot.reader,
        sourceWork: snapshot.sourceWork,
        sections: snapshot.sections,
        series: snapshot.series,
        publishedRevision: snapshot.publishedRevision,
      };
      return work;
    } catch {
      return undefined;
    }
  }
}
