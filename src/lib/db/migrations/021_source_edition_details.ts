import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Details of the edition a sourced work was taken from.
 *
 * Additive: source_works.publisher, edition_year (printing year), printing, editor_name,
 * translator_name, isbn (all nullable). The first publication year stays in publication_year.
 * Idempotent, guarded per column (same pattern as 019/020).
 */
const COLUMNS: Array<{ name: string; type: "text" | "integer" }> = [
  { name: "publisher", type: "text" },
  { name: "edition_year", type: "integer" },
  { name: "printing", type: "text" },
  { name: "editor_name", type: "text" },
  { name: "translator_name", type: "text" },
  { name: "isbn", type: "text" },
];

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const column of COLUMNS) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'source_works' AND column_name = ${column.name}
      ) AS exists
    `.execute(db);
    if (existing.rows[0]?.exists !== true) {
      await db.schema.alterTable("source_works").addColumn(column.name, column.type).execute().catch(() => {
        /* column may have been added by a concurrent run */
      });
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of [...COLUMNS].reverse()) {
    await db.schema.alterTable("source_works").dropColumn(column.name).execute().catch(() => {});
  }
}
