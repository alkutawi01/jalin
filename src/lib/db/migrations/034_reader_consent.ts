import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * What a reader agreed to when the account was made (Malaysia: parental consent applies to anyone under 18, so an account is for an adult).
 *
 * Additive: three nullable columns on reader_accounts.
 *   terms_version      the version of the Terma penggunaan and Dasar privasi the reader accepted (a date string, see terms-version.ts)
 *   terms_accepted_at  when
 *   adult_confirmed_at when they confirmed being 18 or older (the same moment, kept apart so it can be reported on its own)
 * Nothing is back-filled. Idempotent (IF NOT EXISTS), so it can be run twice.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE reader_accounts ADD COLUMN IF NOT EXISTS terms_version text`.execute(db);
  await sql`ALTER TABLE reader_accounts ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz`.execute(db);
  await sql`ALTER TABLE reader_accounts ADD COLUMN IF NOT EXISTS adult_confirmed_at timestamptz`.execute(db);
}
