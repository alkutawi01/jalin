import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Content projection parity (Phase 4D-1C).
 *
 * Additive: works.metadata jsonb + works.reader jsonb (both nullable).
 * markdown frontmatter carries metadata.characters and reader.note; without
 * these columns the DB path can never reproduce the Markdown HTML baseline.
 *
 * Idempotent: guarded per column (same pattern as 013).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  for (const column of ["metadata", "reader"]) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'works' AND column_name = ${column}
      ) AS exists
    `.execute(db);

    if (existing.rows[0]?.exists !== true) {
      await db.schema
        .alterTable("works")
        .addColumn(column, "jsonb")
        .execute()
        .catch(() => {
          /* column may have been added by a concurrent run */
        });
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("works").dropColumn("reader").execute().catch(() => {});
  await db.schema.alterTable("works").dropColumn("metadata").execute().catch(() => {});
}
