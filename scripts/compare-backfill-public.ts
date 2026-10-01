/**
 * Check that freezing published works changes nothing readers see: dump every public work before
 * and after `backfill-published-revisions --apply` and compare. Run with AUDIT_ENV (test branch only):
 *   AUDIT_ENV=f npx tsx scripts/compare-backfill-public.ts before > before.json
 *   AUDIT_ENV=f npx tsx scripts/backfill-published-revisions.ts --apply
 *   AUDIT_ENV=f npx tsx scripts/compare-backfill-public.ts after  > after.json
 */
import { config } from "dotenv";
if (process.env.AUDIT_ENV) config({ path: process.env.AUDIT_ENV, override: true });
import { closeDb } from "../src/lib/db";
import { DatabaseContentRepository } from "../src/lib/content/database-repository";

async function main() {
  process.env.CONTENT_SOURCE = "database";
  const repo = new DatabaseContentRepository();
  await repo.init();
  const out = repo.getWorks().map((w) => {
    const o = JSON.parse(JSON.stringify(w));
    for (const k of ["publishedRevisionId", "revisionCount"]) delete o[k];
    return o;
  }).sort((a, b) => a.slug.localeCompare(b.slug));
  process.stdout.write(JSON.stringify(out, null, 1));
  await closeDb?.();
}
main().catch((e) => { console.error(e); process.exit(1); });
