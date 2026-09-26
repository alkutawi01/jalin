import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("work_submissions")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("proposed_type", "text")
    .addColumn("proposed_title", "text")
    .addColumn("proposed_slug", "text")
    .addColumn("manuscript", "text")
    .addColumn("dek", "text")
    .addColumn("status", "text", (col) => col.notNull().defaultTo("draft"))
    .addColumn("submitter_type", "text", (col) => col.notNull().defaultTo("human"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .addColumn("reviewed_at", "timestamptz")
    .addColumn("reviewer_notes", "text")
    .addColumn("result_work_id", "text")
    .execute();

  await db.schema
    .createTable("submission_contributions")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("submission_id", "integer", (col) =>
      col.notNull().references("work_submissions.id")
    )
    .addColumn("contributor_slug", "text")
    .addColumn("guest_name", "text")
    .addColumn("role_key", "text")
    .addColumn("role_label", "text", (col) => col.notNull().defaultTo(""))
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("suggested_public_credit", "text")
    .addColumn("ai_provider", "text")
    .addColumn("ai_model", "text")
    .addColumn("ai_persona", "text")
    .addColumn("ai_actual_role", "text")
    .addColumn("ai_identity_source", "text", (col) => col.notNull().defaultTo("unknown"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .execute();

  await db.schema
    .createTable("prompt_templates")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("prompt_text", "text", (col) => col.notNull())
    .addColumn("scope", "text", (col) => col.notNull().defaultTo("global"))
    .addColumn("work_type", "text")
    .addColumn("work_id", "text")
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("status", "text", (col) => col.notNull().defaultTo("active"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .execute();

  await db.schema
    .createTable("visual_requests")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("work_id", "text")
    .addColumn("submission_id", "integer")
    .addColumn("visual_role", "text", (col) => col.notNull().defaultTo("inline"))
    .addColumn("prompt", "text", (col) => col.notNull())
    .addColumn("provider", "text", (col) => col.notNull().defaultTo("magnific"))
    .addColumn("provider_request_id", "text")
    .addColumn("provider_creation_id", "text")
    .addColumn("status", "text", (col) => col.notNull().defaultTo("draft"))
    .addColumn("source_asset_url", "text")
    .addColumn("source_asset_path", "text")
    .addColumn("alt_text", "text")
    .addColumn("anchor", "text")
    .addColumn("place", "text", (col) => col.notNull().defaultTo("after"))
    .addColumn("approval_state", "text", (col) => col.notNull().defaultTo("pending"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("visual_requests").execute();
  await db.schema.dropTable("prompt_templates").execute();
  await db.schema.dropTable("submission_contributions").execute();
  await db.schema.dropTable("work_submissions").execute();
}
