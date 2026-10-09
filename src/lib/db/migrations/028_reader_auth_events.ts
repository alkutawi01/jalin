import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Counts for the sign-in rate limits (reader accounts): one row each time a code is requested and each time a wrong code is entered,
 * keyed by a keyed hash of the e-mail address or of the visitor's address, never the address itself.
 *
 * Additive: one new table. Idempotent (IF NOT EXISTS). Rows older than a day are of no use and may be deleted at any time.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS reader_auth_events (
      id bigserial PRIMARY KEY,
      kind text NOT NULL CHECK (kind IN ('request', 'verify_fail')),
      scope text NOT NULL CHECK (scope IN ('email', 'ip', 'global')),
      key_mac text NOT NULL,
      at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS reader_auth_events_lookup ON reader_auth_events (kind, scope, key_mac, at DESC)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS reader_auth_events`.execute(db);
}
