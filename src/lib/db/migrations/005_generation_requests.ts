import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("generation_requests")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("submission_id", "integer", (col) =>
      col.notNull().references("work_submissions.id")
    )
    .addColumn("prompt_template_id", "integer")
    .addColumn("prompt_composed", "text", (col) => col.notNull())
    .addColumn("provider", "text", (col) => col.notNull())
    .addColumn("model", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("queued"))
    .addColumn("requested_by", "text", (col) => col.notNull().defaultTo("admin"))
    .addColumn("provider_request_id", "text")
    .addColumn("token_input", "integer")
    .addColumn("token_output", "integer")
    .addColumn("token_total", "integer")
    .addColumn("estimated_cost_cents", "integer")
    .addColumn("currency", "text", (col) => col.notNull().defaultTo("usd"))
    .addColumn("error_category", "text")
    .addColumn("error_message", "text")
    .addColumn("result_manuscript", "text")
    .addColumn("idempotency_key", "text", (col) => col.notNull())
    .addColumn("started_at", "timestamptz")
    .addColumn("completed_at", "timestamptz")
    .addColumn("failed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .execute();

  await db.schema
    .createIndex("generation_requests_submission_idx")
    .on("generation_requests")
    .column("submission_id")
    .execute();

  await db.schema
    .createIndex("generation_requests_status_idx")
    .on("generation_requests")
    .column("status")
    .execute();

  await db.schema
    .createIndex("generation_requests_idempotency_idx")
    .on("generation_requests")
    .column("idempotency_key")
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("generation_requests").execute();
}
