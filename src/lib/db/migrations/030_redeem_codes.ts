import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Redeem codes (study: docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md sections 5.6 to 5.8, 14 to 18). Two kinds, both turning into a period in
 * the access ledger (`entitlements`, migration 029):
 *
 *  - card codes: one secret code per card, kept ONLY as a keyed hash that also covers the batch number printed on the card; a code is
 *    used once, ever (a UNIQUE on redemptions.code_id), and the redemption is what proves it was used;
 *  - shared codes: one code many readers may use up to a limit Izzat sets, once per reader (UNIQUE), with an optional last day.
 *
 * Also: a switch kept in the database that stops all redeeming at once without a deploy, and two more kinds of count for the rate limits.
 *
 * Additive, idempotent. The one change to an existing table (reader_auth_events) only widens two CHECK lists so the new kinds are
 * accepted; nothing is removed. Nothing reads these tables for a page yet.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE SEQUENCE IF NOT EXISTS redeem_serial_seq START 1`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS code_batches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_number text NOT NULL,
      months smallint NOT NULL CHECK (months IN (1, 6, 12)),
      quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 5000),
      status text NOT NULL DEFAULT 'PENDING_PRINT' CHECK (status IN ('PENDING_PRINT', 'PRINT_CONFIRMED', 'VOIDED')),
      order_ref text,
      note text,
      key_id text NOT NULL,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      confirmed_at timestamptz,
      voided_at timestamptz,
      void_reason text,
      CHECK ((voided_at IS NULL) = (void_reason IS NULL))
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS code_batches_number ON code_batches (batch_number)`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS redeem_codes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_id uuid NOT NULL REFERENCES code_batches(id),
      serial text NOT NULL,
      code_mac text NOT NULL,
      key_id text NOT NULL,
      state text NOT NULL DEFAULT 'generated' CHECK (state IN ('generated', 'issued', 'revoked')),
      issued_at timestamptz,
      revoked_at timestamptz,
      revoke_reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK ((state = 'revoked') = (revoked_at IS NOT NULL)),
      CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS redeem_codes_mac ON redeem_codes (key_id, code_mac)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS redeem_codes_serial ON redeem_codes (serial)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS redeem_codes_batch ON redeem_codes (batch_id, state)`.execute(db);

  // A card code is redeemed once, for ever: code_id is UNIQUE. The reader link is cut, not the record, if the reader deletes the account.
  await sql`
    CREATE TABLE IF NOT EXISTS redemptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code_id uuid NOT NULL UNIQUE REFERENCES redeem_codes(id),
      account_id uuid REFERENCES reader_accounts(id) ON DELETE SET NULL,
      entitlement_id uuid NOT NULL UNIQUE REFERENCES entitlements(id),
      redeemed_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS redemptions_account ON redemptions (account_id) WHERE account_id IS NOT NULL`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS shared_codes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL,
      grant_unit text NOT NULL CHECK (grant_unit IN ('days', 'months')),
      grant_amount smallint NOT NULL,
      max_redemptions integer NOT NULL CHECK (max_redemptions BETWEEN 1 AND 100000),
      redeemed_count integer NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
      expires_at timestamptz,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
      channel text,
      note text,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (redeemed_count <= max_redemptions),
      CHECK ((grant_unit = 'days' AND grant_amount IN (7, 14)) OR (grant_unit = 'months' AND grant_amount IN (1, 6, 12)))
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS shared_codes_code ON shared_codes (code)`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS shared_redemptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      shared_code_id uuid NOT NULL REFERENCES shared_codes(id),
      account_id uuid REFERENCES reader_accounts(id) ON DELETE SET NULL,
      entitlement_id uuid NOT NULL UNIQUE REFERENCES entitlements(id),
      redeemed_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);
  // One use per reader. (An account that is later deleted loses the link, so the same person re-registering is a new account: the
  // trial rule already treats that case; for shared codes it is accepted and bounded by the limit.)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS shared_redemptions_once ON shared_redemptions (shared_code_id, account_id) WHERE account_id IS NOT NULL`.execute(db);

  // The stop switch for all redeeming, read from the database on every redemption (not an environment variable that needs a deploy).
  await sql`
    CREATE TABLE IF NOT EXISTS reader_switches (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text
    )
  `.execute(db);

  // More kinds of count for the rate limits: wrong codes at the redeem page, kept per account and per visitor.
  await sql`ALTER TABLE reader_auth_events DROP CONSTRAINT IF EXISTS reader_auth_events_kind_check`.execute(db);
  await sql`ALTER TABLE reader_auth_events ADD CONSTRAINT reader_auth_events_kind_check CHECK (kind IN ('request', 'verify_fail', 'redeem_fail'))`.execute(db);
  await sql`ALTER TABLE reader_auth_events DROP CONSTRAINT IF EXISTS reader_auth_events_scope_check`.execute(db);
  await sql`ALTER TABLE reader_auth_events ADD CONSTRAINT reader_auth_events_scope_check CHECK (scope IN ('email', 'ip', 'global', 'account'))`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS shared_redemptions`.execute(db);
  await sql`DROP TABLE IF EXISTS shared_codes`.execute(db);
  await sql`DROP TABLE IF EXISTS redemptions`.execute(db);
  await sql`DROP TABLE IF EXISTS redeem_codes`.execute(db);
  await sql`DROP TABLE IF EXISTS code_batches`.execute(db);
  await sql`DROP TABLE IF EXISTS reader_switches`.execute(db);
  await sql`DROP SEQUENCE IF EXISTS redeem_serial_seq`.execute(db);
}
