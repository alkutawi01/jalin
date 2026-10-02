import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Series title page illustration.
 *
 * Additive: series.hero_src text + series.hero_alt text (both nullable). Without a value the series
 * page shows its typographic masthead. Idempotent, guarded per column (same pattern as 019).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  for (const name of ["hero_src", "hero_alt"]) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series' AND column_name = ${name}
      ) AS exists
    `.execute(db);
    if (existing.rows[0]?.exists !== true) {
      await db.schema.alterTable("series").addColumn(name, "text").execute().catch(() => {
        /* column may have been added by a concurrent run */
      });
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const name of ["hero_alt", "hero_src"]) {
    await db.schema.alterTable("series").dropColumn(name).execute().catch(() => {});
  }
}
