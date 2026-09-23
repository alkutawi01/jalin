import type { Kysely } from "kysely";

/**
 * Migration 002: Add public flag to credits table
 * Adds is_public boolean to control credit visibility on public pages.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("credits")
    .addColumn("is_public", "boolean", (col) => col.notNull().defaultTo(true))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("credits")
    .dropColumn("is_public")
    .execute();
}
