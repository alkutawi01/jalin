import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("visual_requests")
    .addColumn(
      "execution_mode",
      "text",
      (col) => col.defaultTo("magnific_api")
    )
    .execute();

  await db.schema
    .alterTable("visual_requests")
    .addColumn("attempt_history", "text", (col) => col.defaultTo("[]"))
    .execute();

  await db.schema
    .alterTable("visual_requests")
    .addColumn("last_webhook_id", "text")
    .execute();

  await db.schema
    .createIndex("visual_requests_task_idx")
    .on("visual_requests")
    .column("provider_request_id")
    .execute();

  await db.schema
    .createIndex("visual_requests_execution_mode_idx")
    .on("visual_requests")
    .column("execution_mode")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("visual_requests_execution_mode_idx").execute();
  await db.schema.dropIndex("visual_requests_task_idx").execute();
  await db.schema.alterTable("visual_requests").dropColumn("last_webhook_id").execute();
  await db.schema.alterTable("visual_requests").dropColumn("attempt_history").execute();
  await db.schema.alterTable("visual_requests").dropColumn("execution_mode").execute();
}
