import type { Kysely } from "kysely";
import type { Database } from "../types";

export async function up(db: Kysely<Database>): Promise<void> {
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
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .execute();

  await db.schema.createIndex("idx_works_type").on("works").column("type").execute();
  await db.schema.createIndex("idx_works_status").on("works").column("status").execute();

  await db.schema
    .createTable("contributors")
    .addColumn("slug", "text", (col) => col.primaryKey())
    .addColumn("display_name", "text", (col) => col.notNull())
    .addColumn("kind", "text", (col) => col.notNull())
    .addColumn("bio", "text")
    .addColumn("disclosure", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .execute();

  await db.schema
    .createTable("credits")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("work_id", "text", (col) => col.notNull().references("works.id").onDelete("cascade"))
    .addColumn("contributor_slug", "text", (col) => col.references("contributors.slug"))
    .addColumn("guest_name", "text")
    .addColumn("role_label", "text", (col) => col.notNull())
    .addColumn("byline", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .execute();

  await db.schema.createIndex("idx_credits_work").on("credits").column("work_id").execute();
  await db.schema.createIndex("idx_credits_contributor").on("credits").column("contributor_slug").execute();

  await db.schema
    .createTable("visuals")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("work_id", "text", (col) => col.notNull().references("works.id").onDelete("cascade"))
    .addColumn("role", "text", (col) => col.notNull().defaultTo("inline"))
    .addColumn("src", "text", (col) => col.notNull())
    .addColumn("alt", "text")
    .addColumn("provider", "text")
    .addColumn("creation_id", "text")
    .addColumn("anchor", "text")
    .addColumn("place", "text", (col) => col.notNull().defaultTo("after"))
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .execute();

  await db.schema.createIndex("idx_visuals_work").on("visuals").column("work_id").execute();

  await db.schema
    .createTable("glossary_terms")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("work_id", "text", (col) => col.notNull().references("works.id").onDelete("cascade"))
    .addColumn("term", "text", (col) => col.notNull())
    .addColumn("meaning", "text", (col) => col.notNull())
    .addColumn("source", "text", (col) => col.notNull().defaultTo("Kamus Dewan Edisi Keempat"))
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(db.fn("now")))
    .execute();

  await db.schema.createIndex("idx_glossary_work").on("glossary_terms").column("work_id").execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("glossary_terms").execute();
  await db.schema.dropTable("visuals").execute();
  await db.schema.dropTable("credits").execute();
  await db.schema.dropTable("contributors").execute();
  await db.schema.dropTable("works").execute();
}
