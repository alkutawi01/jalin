import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Novela & Bersiri structural model (Phase 4D-8).
 * Additive: reading_sections (Novela internal sections), series + series_entries (Bersiri).
 * Idempotent: safe for the untracked file runner that re-executes every file.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // --- reading_sections ---
  const rs = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'reading_sections'
    ) AS exists
  `.execute(db);
  if (rs.rows[0]?.exists !== true) {
    await db.schema
      .createTable("reading_sections")
      .addColumn("id", "serial", (col) => col.primaryKey())
      .addColumn("work_id", "text", (col) =>
        col.notNull().references("works.id").onDelete("cascade")
      )
      .addColumn("slug", "text", (col) => col.notNull())
      .addColumn("title", "text")
      .addColumn("position", "integer", (col) => col.notNull().check(sql`position >= 1`))
      .addColumn("body", "text", (col) => col.notNull())
      .addColumn("reading_minutes", "integer")
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addColumn("updated_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addUniqueConstraint("reading_sections_work_slug_key", ["work_id", "slug"])
      .addUniqueConstraint("reading_sections_work_position_key", ["work_id", "position"])
      .execute()
      .catch(() => {});
  }
  await db.schema
    .createIndex("reading_sections_work_position_idx")
    .on("reading_sections")
    .columns(["work_id", "position"])
    .execute()
    .catch(() => {});

  // --- series ---
  const se = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'series'
    ) AS exists
  `.execute(db);
  if (se.rows[0]?.exists !== true) {
    await db.schema
      .createTable("series")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("slug", "text", (col) => col.notNull().unique())
      .addColumn("title", "text", (col) => col.notNull())
      .addColumn("dek", "text")
      .addColumn("genre", "text")
      .addColumn("audience", "text")
      .addColumn("mode", "text", (col) =>
        col.notNull().defaultTo("continuous").check(sql`mode in ('continuous','anthology')`)
      )
      .addColumn("status", "text", (col) =>
        col.notNull().defaultTo("ongoing").check(sql`status in ('ongoing','completed')`)
      )
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addColumn("updated_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .execute()
      .catch(() => {});
  }

  // --- series_entries ---
  const ee = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'series_entries'
    ) AS exists
  `.execute(db);
  if (ee.rows[0]?.exists !== true) {
    await db.schema
      .createTable("series_entries")
      .addColumn("id", "serial", (col) => col.primaryKey())
      .addColumn("series_id", "text", (col) =>
        col.notNull().references("series.id").onDelete("cascade")
      )
      .addColumn("work_id", "text", (col) =>
        col.notNull().unique().references("works.id").onDelete("cascade")
      )
      .addColumn("position", "integer", (col) => col.notNull().check(sql`position >= 1`))
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addColumn("updated_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addUniqueConstraint("series_entries_series_position_key", ["series_id", "position"])
      .execute()
      .catch(() => {});
  }
  await db.schema
    .createIndex("series_entries_series_position_idx")
    .on("series_entries")
    .columns(["series_id", "position"])
    .execute()
    .catch(() => {});
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("series_entries_series_position_idx").execute().catch(() => {});
  await db.schema.dropTable("series_entries").execute().catch(() => {});
  await db.schema.dropTable("series").execute().catch(() => {});
  await db.schema.dropIndex("reading_sections_work_position_idx").execute().catch(() => {});
  await db.schema.dropTable("reading_sections").execute().catch(() => {});
}
