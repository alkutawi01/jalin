import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Source provenance & rights governance (Phase 4D-7).
 * Additive: creates source_works for derivative Works (terjemahan/fragmen/sinopsis).
 * Idempotent: safe for the untracked file runner that re-executes every file.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const existing = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'source_works'
    ) AS exists
  `.execute(db);

  const alreadyExists = existing.rows[0]?.exists === true;
  if (!alreadyExists) {
    await db.schema
      .createTable("source_works")
      .addColumn("id", "serial", (col) => col.primaryKey())
      .addColumn("work_id", "text", (col) =>
        col.notNull().unique().references("works.id").onDelete("cascade")
      )
      .addColumn("original_title", "text")
      .addColumn("author", "text")
      .addColumn("original_language", "text")
      .addColumn("publication_year", "integer")
      .addColumn("source_edition", "text")
      .addColumn("source_url", "text")
      .addColumn("source_locator", "text")
      .addColumn("source_text_basis", "text")
      .addColumn("rights_status", "text", (col) =>
        col.notNull().defaultTo("unknown")
      )
      .addColumn("rights_notes", "text")
      .addColumn("rights_evidence", "text")
      .addColumn("rights_history", "text")
      .addColumn("approved_material_hash", "text")
      .addColumn("reviewed_at", "timestamptz")
      .addColumn("reviewed_by", "text")
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addColumn("updated_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .execute()
      .catch(() => {
        /* table may already exist on re-run */
      });
  }

  await db.schema
    .createIndex("source_works_work_id_idx")
    .on("source_works")
    .column("work_id")
    .execute()
    .catch(() => {
      /* index may already exist on re-run */
    });

  await db.schema
    .createIndex("source_works_rights_status_idx")
    .on("source_works")
    .column("rights_status")
    .execute()
    .catch(() => {
      /* index may already exist on re-run */
    });
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("source_works_rights_status_idx")
    .execute()
    .catch(() => {});
  await db.schema
    .dropIndex("source_works_work_id_idx")
    .execute()
    .catch(() => {});
  await db.schema
    .dropTable("source_works")
    .execute()
    .catch(() => {});
}
