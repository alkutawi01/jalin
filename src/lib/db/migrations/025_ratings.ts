import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Ratings ("Penilaian"): what a chatbot said about a whole work (cerpen, novela) or a whole finished series.
 *
 * One row for each rating pasted in by an editor. A work may have several raters; for one rater the newest accepted rating is
 * the current one (is_current) and the earlier ones stay as history. A rating is tied to the text it read (text_hash, and the
 * reference code made from it); when the text changes, the service marks it stale. Editor-side only for now: nothing here is
 * part of a published snapshot or the public payload.
 *
 * Additive and idempotent (guarded, as 015).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const exists = await sql<{ exists: boolean }>`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ratings') AS exists
  `.execute(db);
  if (exists.rows[0]?.exists === true) return;

  await db.schema
    .createTable("ratings")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("target_kind", "text", (col) => col.notNull()) // 'work' | 'series'
    .addColumn("target_id", "text", (col) => col.notNull())
    .addColumn("reviewer", "text", (col) => col.notNull()) // the model, as shown: "ChatGPT"
    .addColumn("reviewer_key", "text", (col) => col.notNull()) // lower case, for "one current rating for each rater"
    .addColumn("rubric_version", "text", (col) => col.notNull())
    .addColumn("ref_code", "text", (col) => col.notNull())
    .addColumn("text_hash", "text", (col) => col.notNull())
    .addColumn("text_words", "integer")
    .addColumn("scores", "jsonb", (col) => col.notNull())
    .addColumn("reasons", "jsonb", (col) => col.notNull())
    .addColumn("evidence", "jsonb", (col) => col.notNull())
    .addColumn("overall", sql`numeric(4,2)`, (col) => col.notNull())
    .addColumn("audience", "text")
    .addColumn("verdict", "text", (col) => col.notNull())
    .addColumn("review", "text", (col) => col.notNull())
    .addColumn("strengths", "jsonb", (col) => col.notNull())
    .addColumn("weaknesses", "jsonb", (col) => col.notNull())
    .addColumn("content_warnings", "text")
    .addColumn("raw_response", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("accepted")) // accepted | published | rejected
    .addColumn("is_current", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("created_by", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("ratings_target_idx").on("ratings").columns(["target_kind", "target_id"]).execute().catch(() => {});
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("ratings").execute().catch(() => {});
}
