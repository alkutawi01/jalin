import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Additive publication audit columns (Phase 4D-6).
 * Idempotent: safe for the untracked file runner that re-executes every file.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const existing = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'works' AND column_name = 'published_by'
    ) AS exists
  `.execute(db);

  const alreadyExists = existing.rows[0]?.exists === true;
  if (!alreadyExists) {
    await db.schema
      .alterTable("works")
      .addColumn("published_by", "text")
      .execute();
  }

  await db.schema
    .createIndex("works_published_at_idx")
    .on("works")
    .column("published_at")
    .execute()
    .catch(() => {
      /* index may already exist on re-run */
    });
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("works_published_at_idx").execute().catch(() => {});
  await db.schema.alterTable("works").dropColumn("published_by").execute().catch(() => {});
}
