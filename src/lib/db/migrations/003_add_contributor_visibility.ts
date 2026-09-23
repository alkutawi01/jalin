import type { Kysely } from "kysely";

/**
 * Migration 003: Add visibility flag to contributors table
 * Adds is_visible boolean to control contributor visibility on public pages.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("contributors")
    .addColumn("is_visible", "boolean", (col) => col.notNull().defaultTo(true))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("contributors")
    .dropColumn("is_visible")
    .execute();
}
