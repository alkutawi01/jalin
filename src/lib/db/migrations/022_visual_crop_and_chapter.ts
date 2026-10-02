import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Which part of an image to show, and which chapter an image belongs to.
 *
 * Additive on visuals: focus_x and focus_y (0-100, the point of interest, percent from the left and top),
 * zoom (100-300, percent) and section_slug (a novela chapter; null for the work's own images).
 * The original file is never changed: the crop is only how it is shown. Idempotent, guarded per column.
 */
const COLUMNS: Array<{ name: string; type: "integer" | "text" }> = [
  { name: "focus_x", type: "integer" },
  { name: "focus_y", type: "integer" },
  { name: "zoom", type: "integer" },
  { name: "section_slug", type: "text" },
];

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const column of COLUMNS) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'visuals' AND column_name = ${column.name}
      ) AS exists
    `.execute(db);
    if (existing.rows[0]?.exists !== true) {
      await db.schema.alterTable("visuals").addColumn(column.name, column.type).execute().catch(() => {
        /* column may have been added by a concurrent run */
      });
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of [...COLUMNS].reverse()) {
    await db.schema.alterTable("visuals").dropColumn(column.name).execute().catch(() => {});
  }
}
