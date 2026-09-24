import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  const exists = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'editorial_audit_runs'
    ) AS exists
  `.execute(db);
  
  if (exists.rows[0]?.exists !== true) {
    await db.schema
      .createTable("editorial_audit_runs")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("generated_at", "timestamptz", (col) => col.notNull())
      .addColumn("summary_json", "text", (col) => col.notNull())
      .addColumn("issues_json", "text", (col) => col.notNull())
      .addColumn("created_by", "text")
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .execute();
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("editorial_audit_runs").execute().catch(() => {});
}