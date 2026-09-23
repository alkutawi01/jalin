import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("work_submissions")
    .addColumn("promoted_at", "timestamptz")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("work_submissions").dropColumn("promoted_at").execute();
}
