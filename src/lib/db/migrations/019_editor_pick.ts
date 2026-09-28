import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Homepage curation (Editor Pick).
 *
 * Additive: works.editor_pick boolean + works.editor_pick_rank integer +
 * works.editor_pick_reason text (all nullable). Curator fields are live DB
 * state only: not part of published revision snapshots, not serialised into
 * Markdown frontmatter (content:compare / sync-status unaffected), never
 * projected into the public payload.
 *
 * Idempotent: guarded per column (same pattern as 018).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const columns: Array<{ name: string; type: "boolean" | "integer" | "text" }> = [
    { name: "editor_pick", type: "boolean" },
    { name: "editor_pick_rank", type: "integer" },
    { name: "editor_pick_reason", type: "text" },
  ];

  for (const column of columns) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'works' AND column_name = ${column.name}
      ) AS exists
    `.execute(db);

    if (existing.rows[0]?.exists !== true) {
      await db.schema
        .alterTable("works")
        .addColumn(column.name, column.type)
        .execute()
        .catch(() => {
          /* column may have been added by a concurrent run */
        });
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of ["editor_pick_reason", "editor_pick_rank", "editor_pick"]) {
    await db.schema.alterTable("works").dropColumn(column).execute().catch(() => {});
  }
}
