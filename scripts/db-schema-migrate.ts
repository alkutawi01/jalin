import { Kysely, PostgresDialect } from "kysely";
import { Migrator } from "kysely/migration";
import { Pool } from "pg";
import type { Database } from "../src/lib/db/types";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
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

  const { results, error } = await migrator.migrateToLatest();

  if (error) {
    console.error("Migration failed:");
    console.error(error);
    process.exit(1);
  }

  if (results) {
    for (const result of results) {
      console.log(`${result.status === "Success" ? "✓" : "✗"} ${result.migrationName}: ${result.status}`);
    }
  }

  console.log("\nSchema migrations complete.");
  await db.destroy();
}

main();
