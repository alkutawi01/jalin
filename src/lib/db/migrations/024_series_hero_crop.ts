import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * The part of a series' picture that matters (the same focus and zoom a work's picture has had since 022).
 *
 * Additive: series.hero_focus_x, hero_focus_y (0-100, percent from the left / top) and hero_zoom (100-300), all nullable.
 * Without values the picture stays centred, as before. Idempotent, guarded per column (same pattern as 020).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  for (const name of ["hero_focus_x", "hero_focus_y", "hero_zoom"]) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series' AND column_name = ${name}
      ) AS exists
    `.execute(db);
    if (existing.rows[0]?.exists !== true) {
      await db.schema.alterTable("series").addColumn(name, "integer").execute().catch(() => {
        /* column may have been added by a concurrent run */
      });
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const name of ["hero_zoom", "hero_focus_y", "hero_focus_x"]) {
    await db.schema.alterTable("series").dropColumn(name).execute().catch(() => {});
  }
}
