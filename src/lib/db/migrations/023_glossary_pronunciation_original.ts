import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Pronunciation and original-language spelling for a glossary term.
 *
 * Additive on glossary_terms, all optional text: pronunciation (how to say it, e.g. "mu-dif"), original_text (the term in
 * its own script, e.g. an Arabic spelling) and original_language (e.g. "Arab"). Terms without them show as before.
 * Idempotent, guarded per column.
 */
const COLUMNS = ["pronunciation", "original_text", "original_language"] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const name of COLUMNS) {
    const existing = await sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'glossary_terms' AND column_name = ${name}
      ) AS exists
    `.execute(db);
    if (existing.rows[0]?.exists !== true) {
      await db.schema.alterTable("glossary_terms").addColumn(name, "text").execute().catch(() => {
        /* column may have been added by a concurrent run */
      });
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const name of [...COLUMNS].reverse()) {
    await db.schema.alterTable("glossary_terms").dropColumn(name).execute().catch(() => {});
  }
}
