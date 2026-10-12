import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * One glossary for a whole series.
 *
 * Until now every episode kept its own glossary (glossary_terms.work_id). In a long series the same terms were defined again in every
 * episode (17 episodes of one series held 60 entries for 21 different terms, "murajaah" and "qiraat" in 14 episodes each) and the
 * spelling drifted ("tasmi'" in 8, "tasmi" in 3). A term of the series is stored once here; an episode may still add or override a
 * term in glossary_terms, and the reader merges the two (the episode's own entry wins).
 *
 * Additive and idempotent. Terms are unique per series ignoring case, so the same word is not defined twice.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS series_glossary_terms (
      id serial PRIMARY KEY,
      series_id text NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      term text NOT NULL,
      meaning text NOT NULL,
      source text NOT NULL DEFAULT 'Kamus Dewan Edisi Keempat',
      pronunciation text,
      original_text text,
      original_language text,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_series_glossary_term ON series_glossary_terms (series_id, lower(term))`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_series_glossary_series ON series_glossary_terms (series_id)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS series_glossary_terms`.execute(db);
}
