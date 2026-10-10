import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Panel Bacaan AI (internal, study doc docs/PANEL_BACAAN_AI.md): a snapshot of exactly what was rated, and the ratings made of it.
 *
 *   panel_snapshots  the text as it was, its hash, how it was assembled (manifest), the code a reviewer must repeat, the rubric version.
 *                    A piece that changes gets a new snapshot (a new hash); ratings of the old one stay what they were.
 *   panel_ratings    one row per answer pasted in: the answer itself (raw, never edited), what was read from it, or why it was refused.
 *                    A rating is voided with a reason, never deleted or edited. The mean is over the valid, un-voided ratings.
 *
 * Additive and idempotent. subject_id is text because a Work id is text and a submission id is a number.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS panel_snapshots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_kind text NOT NULL CHECK (subject_kind IN ('work', 'submission')),
      subject_id text NOT NULL,
      work_type text NOT NULL CHECK (work_type IN ('cerpen', 'novela', 'bersiri')),
      title text NOT NULL,
      content_hash text NOT NULL,
      text_body text NOT NULL,
      manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
      char_count integer NOT NULL,
      ref_code text NOT NULL UNIQUE,
      rubric_version text NOT NULL,
      prompt_version text NOT NULL,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (subject_kind, subject_id, content_hash, rubric_version)
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS panel_snapshots_subject ON panel_snapshots (subject_kind, subject_id, created_at DESC)`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS panel_ratings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_id uuid NOT NULL REFERENCES panel_snapshots(id),
      reviewer_label text NOT NULL,
      provider text,
      contributed text NOT NULL DEFAULT 'tidak_diketahui' CHECK (contributed IN ('ya', 'tidak', 'tidak_diketahui')),
      status text NOT NULL CHECK (status IN ('valid', 'invalid')),
      errors jsonb NOT NULL DEFAULT '[]'::jsonb,
      warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
      model_claimed text,
      scores jsonb,
      composite_num bigint,
      composite_den bigint,
      composite_text text,
      evidence_flagged boolean NOT NULL DEFAULT false,
      age_class text,
      summary text,
      strengths text,
      improvements text,
      raw_response text NOT NULL,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      voided_at timestamptz,
      voided_by text,
      void_reason text,
      CHECK ((status = 'valid' AND composite_num IS NOT NULL AND composite_den IS NOT NULL AND composite_den > 0) OR status = 'invalid'),
      CHECK (voided_at IS NULL OR (void_reason IS NOT NULL AND length(trim(void_reason)) > 0))
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS panel_ratings_snapshot ON panel_ratings (snapshot_id, created_at)`.execute(db);

  // What the chief editor may change: the threshold and which model is the official reviewer. Missing rows mean the defaults in code.
  await sql`
    CREATE TABLE IF NOT EXISTS panel_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS panel_settings`.execute(db);
  await sql`DROP TABLE IF EXISTS panel_ratings`.execute(db);
  await sql`DROP TABLE IF EXISTS panel_snapshots`.execute(db);
}
