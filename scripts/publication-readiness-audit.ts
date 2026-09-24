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
  const contributors = await db.selectFrom("contributors").select("slug").execute();
  const known = new Set(contributors.map((c) => String(c.slug)));

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
