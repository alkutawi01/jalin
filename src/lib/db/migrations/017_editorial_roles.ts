import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  const exists = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'editorial_roles'
    ) AS exists
  `.execute(db);
  
  if (exists.rows[0]?.exists !== true) {
    await db.schema
      .createTable("editorial_roles")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull().unique())
      .addColumn("description", "text")
      .addColumn("permissions_json", "text", (col) => col.notNull())
      .addColumn("created_at", "timestamptz", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .execute();
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("editorial_roles").execute().catch(() => {});
}