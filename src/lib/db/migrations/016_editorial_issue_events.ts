import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  const exists = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'editorial_issue_events'
    ) AS exists
  `.execute(db);
  
  if (exists.rows[0]?.exists !== true) {
    await db.schema
      .createTable("editorial_issue_events")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("issue_id", "text", (col) =>
        col.notNull().references("editorial_issues.id").onDelete("cascade")
      )
      .addColumn("action", "text", (col) => col.notNull())
      .addColumn("from_status", "text")
      .addColumn("to_status", "text", (col) => col.notNull())
      .addColumn("actor", "text")
      .addColumn("metadata_json", "text")
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .execute();
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("editorial_issue_events").execute().catch(() => {});
}