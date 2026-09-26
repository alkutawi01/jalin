import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Living Text & Editorial Revision System (Phase 4D-9).
 * 
 * Adds work_revisions table for published snapshots.
 * Adds published_revision_id, revision_count, first_published_at to works.
 * Idempotent: safe against any prior partial state — every object is guarded.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // --- work_revisions ---
  const wr = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'work_revisions'
    ) AS exists
  `.execute(db);
  if (wr.rows[0]?.exists !== true) {
    await db.schema
      .createTable("work_revisions")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("work_id", "text", (col) =>
        col.notNull().references("works.id").onDelete("cascade")
      )
      .addColumn("revision_no", "integer", (col) => col.notNull())
      .addColumn("version_label", "text")
      .addColumn("change_type", "text", (col) =>
        col.notNull().defaultTo("minor").check(sql`change_type in ('major','minor','patch')`)
      )
      .addColumn("revision_summary", "text")
      .addColumn("snapshot", "jsonb", (col) => col.notNull())
      .addColumn("content_hash", "text", (col) => col.notNull())
      .addColumn("published_by", "text", (col) => col.notNull())
      .addColumn("published_at", "timestamptz", (col) => col.notNull())
      .addColumn("first_published_at", "timestamptz")
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addUniqueConstraint("work_revisions_work_revision_key", ["work_id", "revision_no"])
      .execute()
      .catch(() => {});
  }
  await db.schema
    .createIndex("work_revisions_work_id_idx")
    .on("work_revisions")
    .column("work_id")
    .execute()
    .catch(() => {});
  await db.schema
    .createIndex("work_revisions_content_hash_idx")
    .on("work_revisions")
    .column("content_hash")
    .execute()
    .catch(() => {});

  // --- works schema additions ---
  // published_revision_id
  const wpr = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'works' AND column_name = 'published_revision_id'
    ) AS exists
  `.execute(db);
  if (wpr.rows[0]?.exists !== true) {
    await db.schema
      .alterTable("works")
      .addColumn("published_revision_id", "text", (col) =>
        col.references("work_revisions.id").onDelete("set null")
      )
      .execute()
      .catch(() => {});
  }
  // revision_count
  const wrc = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'works' AND column_name = 'revision_count'
    ) AS exists
  `.execute(db);
  if (wrc.rows[0]?.exists !== true) {
    await db.schema
      .alterTable("works")
      .addColumn("revision_count", "integer", (col) =>
        col.notNull().defaultTo(0)
      )
      .execute()
      .catch(() => {});
  }
  // first_published_at
  const wfp = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'works' AND column_name = 'first_published_at'
    ) AS exists
  `.execute(db);
  if (wfp.rows[0]?.exists !== true) {
    await db.schema
      .alterTable("works")
      .addColumn("first_published_at", "timestamptz")
      .execute()
      .catch(() => {});
  }
  // version_label (current working copy version)
  const wvl = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'works' AND column_name = 'version_label'
    ) AS exists
  `.execute(db);
  if (wvl.rows[0]?.exists !== true) {
    await db.schema
      .alterTable("works")
      .addColumn("version_label", "text")
      .execute()
      .catch(() => {});
  }

  // Indexes
  await db.schema
    .createIndex("works_published_revision_idx")
    .on("works")
    .column("published_revision_id")
    .execute()
    .catch(() => {});
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("works_published_revision_idx").execute().catch(() => {});
  await db.schema.dropIndex("work_revisions_content_hash_idx").execute().catch(() => {});
  await db.schema.dropIndex("work_revisions_work_id_idx").execute().catch(() => {});
  await db.schema.dropTable("work_revisions").execute().catch(() => {});
  await db.schema
    .alterTable("works")
    .dropColumn("published_revision_id")
    .dropColumn("revision_count")
    .dropColumn("first_published_at")
    .dropColumn("version_label")
    .execute()
    .catch(() => {});
}