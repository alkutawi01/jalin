import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("visual_requests").addColumn("started_at", "timestamptz").execute();
  await db.schema.alterTable("visual_requests").addColumn("completed_at", "timestamptz").execute();
  await db.schema.alterTable("visual_requests").addColumn("approved_at", "timestamptz").execute();
  await db.schema.alterTable("visual_requests").addColumn("rejected_at", "timestamptz").execute();
  await db.schema.alterTable("visual_requests").addColumn("failed_at", "timestamptz").execute();

  await db.schema
    .alterTable("visual_requests")
    .addColumn("requested_by", "text", (col) => col.notNull().defaultTo("admin"))
    .execute();
  await db.schema.alterTable("visual_requests").addColumn("approved_by", "text").execute();
  await db.schema.alterTable("visual_requests").addColumn("error_category", "text").execute();
  await db.schema.alterTable("visual_requests").addColumn("error_message", "text").execute();
  await db.schema
    .alterTable("visual_requests")
    .addColumn("retry_count", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
  await db.schema.alterTable("visual_requests").addColumn("idempotency_key", "text").execute();
  await db.schema
    .alterTable("visual_requests")
    .addColumn("aspect_ratio", "text", (col) => col.notNull().defaultTo("3:2"))
    .execute();
  await db.schema.alterTable("visual_requests").addColumn("model", "text").execute();
  await db.schema.alterTable("visual_requests").addColumn("prompt_composed", "text").execute();
  await db.schema.alterTable("visual_requests").addColumn("asset_width", "integer").execute();
  await db.schema.alterTable("visual_requests").addColumn("asset_height", "integer").execute();
  await db.schema.alterTable("visual_requests").addColumn("asset_mime_type", "text").execute();
  await db.schema
    .alterTable("visual_requests")
    .addColumn("asset_finalized", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();

  await db.schema
    .createIndex("visual_requests_status_idx")
    .on("visual_requests")
    .column("status")
    .execute();
  await db.schema
    .createIndex("visual_requests_approval_idx")
    .on("visual_requests")
    .column("approval_state")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("visual_requests_approval_idx").execute();
  await db.schema.dropIndex("visual_requests_status_idx").execute();
  const cols = [
    "asset_finalized", "asset_mime_type", "asset_height", "asset_width",
    "prompt_composed", "model", "aspect_ratio", "idempotency_key",
    "retry_count", "error_message", "error_category", "approved_by",
    "requested_by", "failed_at", "rejected_at", "approved_at",
    "completed_at", "started_at",
  ];
  for (const c of cols) {
    await db.schema.alterTable("visual_requests").dropColumn(c).execute();
  }
}
