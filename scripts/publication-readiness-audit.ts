/**
 * Read-only publication readiness audit against existing Works.
 * Never mutates any row. Use for backward-compatibility checks (Phase 4D-6).
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import { evaluatePublicationReadinessFromData } from "../src/lib/admin/publication-readiness";

async function main() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = getDb();
  const works = await db.selectFrom("works").selectAll().orderBy("id", "asc").execute();
  const credits = await db.selectFrom("credits").selectAll().execute();
  const visuals = await db.selectFrom("visuals").selectAll().execute();
  const glossary = await db.selectFrom("glossary_terms").selectAll().execute();
  const visualRequests = await db.selectFrom("visual_requests").selectAll().execute();
  const sources = await db.selectFrom("source_works").selectAll().execute();
  const sections = await db.selectFrom("reading_sections").selectAll().execute();
  const seriesEntries = await db.selectFrom("series_entries").selectAll().execute();
  const seriesRows = await db.selectFrom("series").selectAll().execute();
  const contributors = await db.selectFrom("contributors").select("slug").execute();
  const known = new Set(contributors.map((c) => String(c.slug)));

  const sourcesByWork = new Map(sources.map((s) => [String(s.work_id), s]));
  const sectionsByWork = new Map<string, typeof sections>();
  for (const s of sections) {
    const wid = String(s.work_id);
    if (!sectionsByWork.has(wid)) sectionsByWork.set(wid, []);
    sectionsByWork.get(wid)!.push(s);
  }
  const entryByWork = new Map(seriesEntries.map((e) => [String(e.work_id), e]));
  const seriesById = new Map(seriesRows.map((s) => [String(s.id), s]));

  let publishedReady = 0;
  let publishedBlocked = 0;
  let readyWorksReady = 0;
  let readyWorksBlocked = 0;
  const problems: string[] = [];

  console.log(`Auditing ${works.length} Works (read-only)...\n`);

  for (const work of works) {
    const input = {
      work: {
        id: String(work.id),
        slug: String(work.slug),
        title: String(work.title ?? ""),
        type: String(work.type),
        status: String(work.status),
        body: work.body ?? null,
        dek: work.dek ?? null,
        genre: work.genre ?? null,
        audience: work.audience ?? null,
        version: String(work.version ?? ""),
        published_at:
          work.published_at instanceof Date
            ? work.published_at.toISOString()
            : work.published_at,
        editorial_history: work.editorial_history,
      },
      credits: credits.filter((c) => c.work_id === work.id),
      visuals: visuals.filter((v) => v.work_id === work.id),
      glossary: glossary.filter((g) => g.work_id === work.id),
      visualRequests: visualRequests.filter((v) => v.work_id === work.id),
      sourceWork: (() => {
        const s = sourcesByWork.get(String(work.id));
        if (!s) return null;
        return {
          original_title: s.original_title,
          author: s.author,
          original_language: s.original_language,
          source_edition: s.source_edition,
          source_url: s.source_url,
          source_locator: s.source_locator,
          source_text_basis: s.source_text_basis,
          rights_status: String(s.rights_status),
          rights_notes: s.rights_notes,
          reviewed_at:
            s.reviewed_at instanceof Date ? s.reviewed_at.toISOString() : s.reviewed_at,
          reviewed_by: s.reviewed_by,
          approved_material_hash: s.approved_material_hash,
        };
      })(),
      readingSections: (sectionsByWork.get(String(work.id)) ?? []).map((s) => ({
        id: Number(s.id),
        work_id: String(s.work_id),
        slug: String(s.slug),
        title: s.title,
        position: Number(s.position),
        body: String(s.body ?? ""),
        reading_minutes: s.reading_minutes,
      })),
      seriesEntry: (() => {
        const e = entryByWork.get(String(work.id));
        if (!e) return null;
        return {
          id: Number(e.id),
          series_id: String(e.series_id),
          work_id: String(e.work_id),
          position: Number(e.position),
        };
      })(),
      series: (() => {
        const e = entryByWork.get(String(work.id));
        if (!e) return null;
        const s = seriesById.get(String(e.series_id));
        if (!s) return null;
        return {
          id: String(s.id),
          slug: String(s.slug),
          title: String(s.title),
          mode: String(s.mode),
          status: String(s.status),
        };
      })(),
      knownContributorSlugs: known,
      slugTakenByOther: false,
    };

    const r = evaluatePublicationReadinessFromData(input);
    const tag = `${work.id} [${work.status}] ${work.slug}`;

    if (work.status === "published") {
      if (r.ready) {
        publishedReady++;
        console.log(`  ✓ ${tag} — ready (grandfather-compatible)`);
      } else {
        publishedBlocked++;
        const msgs = r.blockers.map((b) => b.code).join(", ");
        problems.push(`${tag}: ${msgs}`);
        console.log(`  ✗ ${tag} — BLOCKED: ${msgs}`);
      }
    } else if (work.status === "ready") {
      if (r.ready) readyWorksReady++;
      else {
        readyWorksBlocked++;
        const msgs = r.blockers.map((b) => b.code).join(", ");
        console.log(`  · ${tag} — not ready: ${msgs}`);
      }
    } else {
      console.log(`  · ${tag} — skipped (status=${work.status})`);
    }
  }

  await closeDb();

  console.log("\n=== Summary ===");
  console.log(`Published works ready: ${publishedReady}/${publishedReady + publishedBlocked}`);
  console.log(`Ready-status works ready: ${readyWorksReady}/${readyWorksReady + readyWorksBlocked}`);
  if (problems.length > 0) {
    console.log("\nCOMPATIBILITY PROBLEMS (published works must remain valid):");
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log("\nREADINESS_AUDIT=PASS (no published Work invalidated)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
