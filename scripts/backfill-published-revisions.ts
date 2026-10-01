/**
 * Freeze the current working copy of every published work that has no frozen public version yet.
 *
 * Why: before this, publishing did not create a revision, so readers saw each published work's live
 * working copy and every edit leaked immediately. After this runs, those works are protected too.
 * The frozen content equals what readers see right now, so nothing visible changes.
 *
 * Dry run by default. Applying to production needs the owner's explicit permission.
 *   AUDIT_ENV=file-with-DATABASE_URL npx tsx scripts/backfill-published-revisions.ts          (dry run)
 *   AUDIT_ENV=file-with-DATABASE_URL npx tsx scripts/backfill-published-revisions.ts --apply  (writes)
 */
import { config } from "dotenv";
if (process.env.AUDIT_ENV) config({ path: process.env.AUDIT_ENV, override: true });
else config({ path: ".env.local" });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import { createRevisionTx } from "../src/lib/admin/revision-service";

async function main() {
  if (!hasDb()) throw new Error("DATABASE_URL tiada");
  const apply = process.argv.includes("--apply");
  const db = getDb();
  const works = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .where("published_revision_id", "is", null)
    .select(["id", "slug", "title"])
    .execute();
  console.log(`${works.length} karya terbit tanpa versi beku${apply ? "" : " (dry run)"}`);
  for (const w of works) {
    console.log(` - ${w.id} ${w.slug}`);
    if (!apply) continue;
    await db.transaction().execute((trx) =>
      createRevisionTx(trx, w.id, { id: "backfill", email: "backfill@jalin.local" }, {
        changeType: "patch",
        preserveMeta: true,
        revisionSummary: "Versi awam dibekukan (pengisian semula)"
      })
    );
  }
  await closeDb?.();
}
main().catch((e) => { console.error(e); process.exit(1); });
