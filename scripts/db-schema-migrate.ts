import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { Kysely, PostgresDialect } from "kysely";
import { Migrator } from "kysely/migration";
import { Pool } from "pg";
import {
  databaseSslEnabled,
  requireMigrationDatabaseUrl,
} from "../src/lib/db/env";
import type { Database } from "../src/lib/db/types";

let databaseUrl: string;
try {
  databaseUrl = requireMigrationDatabaseUrl();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid migration environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseSslEnabled() ? { rejectUnauthorized: false } : false,
  max: 1,
});

const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

// Migration files
const migrations = {
  "001_create_tables": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("works")
        .addColumn("id", "text", (col) => col.primaryKey())
        .addColumn("slug", "text", (col) => col.notNull().unique())
        .addColumn("title", "text", (col) => col.notNull())
        .addColumn("type", "text", (col) => col.notNull())
        .addColumn("status", "text", (col) => col.notNull().defaultTo("draft"))
        .addColumn("genre", "text")
        .addColumn("audience", "text")
        .addColumn("dek", "text")
        .addColumn("body", "text")
        .addColumn("reading_minutes", "integer")
        .addColumn("version", "text", (col) => col.notNull().defaultTo("v0.1"))
        .addColumn("editorial_history", "jsonb", (col) => col.notNull().defaultTo("[]"))
        .addColumn("published_at", "timestamptz")
        .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .execute();

      await db.schema
        .createTable("contributors")
        .addColumn("slug", "text", (col) => col.primaryKey())
        .addColumn("display_name", "text", (col) => col.notNull())
        .addColumn("kind", "text", (col) => col.notNull())
        .addColumn("bio", "text")
        .addColumn("disclosure", "text")
        .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .execute();

      await db.schema
        .createTable("credits")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("work_id", "text", (col) => col.notNull().references("works.id"))
        .addColumn("contributor_slug", "text")
        .addColumn("guest_name", "text")
        .addColumn("role_label", "text", (col) => col.notNull())
        .addColumn("byline", "boolean", (col) => col.notNull().defaultTo(false))
        .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .execute();

      await db.schema
        .createTable("visuals")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("work_id", "text", (col) => col.notNull().references("works.id"))
        .addColumn("role", "text", (col) => col.notNull().defaultTo("inline"))
        .addColumn("src", "text", (col) => col.notNull())
        .addColumn("alt", "text")
        .addColumn("provider", "text")
        .addColumn("creation_id", "text")
        .addColumn("anchor", "text")
        .addColumn("place", "text", (col) => col.notNull().defaultTo("after"))
        .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .execute();

      await db.schema
        .createTable("glossary_terms")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("work_id", "text", (col) => col.notNull().references("works.id"))
        .addColumn("term", "text", (col) => col.notNull())
        .addColumn("meaning", "text", (col) => col.notNull())
        .addColumn("source", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("glossary_terms").execute();
      await db.schema.dropTable("visuals").execute();
      await db.schema.dropTable("credits").execute();
      await db.schema.dropTable("contributors").execute();
      await db.schema.dropTable("works").execute();
    },
  },
  "002_add_credit_public_flag": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .alterTable("credits")
        .addColumn("is_public", "boolean", (col) => col.notNull().defaultTo(true))
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.alterTable("credits").dropColumn("is_public").execute();
    },
  },
  "003_add_contributor_visibility": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .alterTable("contributors")
        .addColumn("is_visible", "boolean", (col) => col.notNull().defaultTo(true))
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.alterTable("contributors").dropColumn("is_visible").execute();
    },
  },
  "004_submission_data_model": {
    async up(db: Kysely<unknown>) {
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
        .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
        .addColumn("source_asset_url", "text")
        .addColumn("source_asset_path", "text")
        .addColumn("alt_text", "text")
        .addColumn("anchor", "text")
        .addColumn("place", "text", (col) => col.notNull().defaultTo("after"))
        .addColumn("approval_state", "text", (col) => col.notNull().defaultTo("pending"))
        .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("visual_requests").execute();
      await db.schema.dropTable("prompt_templates").execute();
      await db.schema.dropTable("submission_contributions").execute();
      await db.schema.dropTable("work_submissions").execute();
    },
  },
  "005_generation_requests": {
    async up(db: Kysely<unknown>) {
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
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("generation_requests").execute();
    },
  },
};

const migrator = new Migrator({
  db,
  provider: {
    async getMigrations() {
      return migrations;
    },
  },
});

async function main() {
  console.log("Running schema migrations...\n");

  try {
    const { results, error } = await migrator.migrateToLatest();

    if (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined;
      console.error(`Migration failed${code ? ` (code ${code})` : ""}.`);
      process.exitCode = 1;
      return;
    }

    if (results) {
      for (const result of results) {
        console.log(`${result.status === "Success" ? "✓" : "✗"} ${result.migrationName}: ${result.status}`);
      }
    }

    console.log("\nSchema migrations complete.");
  } finally {
    await db.destroy();
  }
}

void main();
