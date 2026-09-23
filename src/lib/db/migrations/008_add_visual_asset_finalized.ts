import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("visuals")
    .addColumn("is_asset_finalized", "boolean", (col) => col.defaultTo(false))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("visuals").dropColumn("is_asset_finalized").execute();
}
