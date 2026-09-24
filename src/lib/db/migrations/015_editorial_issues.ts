import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  const exists = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'editorial_issues'
    ) AS exists
  `.execute(db);
  
  if (exists.rows[0]?.exists !== true) {
    await db.schema
      .createTable("editorial_issues")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("type", "text", (col) => col.notNull())
      .addColumn("work_id", "text")
      .addColumn("severity", "text", (col) => col.notNull())
      .addColumn("status", "text", (col) => col.notNull().defaultTo("open"))
      .addColumn("message", "text", (col) => col.notNull())
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .addColumn("resolved_at", "timestamptz")
      .execute();
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("editorial_issues").execute().catch(() => {});
}