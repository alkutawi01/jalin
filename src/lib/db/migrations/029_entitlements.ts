import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * The access ledger (study: docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md sections 5.4, 5.5, 14 to 16): one row for each period of access a
 * reader was given, whether the 14-day trial, a card code, a shared code or a grant by Izzat. What a reader may read is worked out from
 * these rows alone, so it can always be rebuilt and checked.
 *
 * Rows are never changed or removed. The only change allowed is to cancel a row once (revoked_at and why), and when a reader deletes
 * their account the link to them is cut (account_id becomes NULL) while the period stays, as an anonymous record of what was given.
 * The database enforces this with a trigger, not just the code.
 *
 * Additive: one new table, one function, one trigger. Idempotent (IF NOT EXISTS, CREATE OR REPLACE). Nothing reads it for a page yet.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS entitlements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id uuid REFERENCES reader_accounts(id) ON DELETE SET NULL,
      kind text NOT NULL CHECK (kind IN ('TRIAL', 'CARD', 'SHARED', 'ADMIN')),
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      source_ref text,
      reason text,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      revoked_by text,
      revoke_reason text,
      CHECK (ends_at > starts_at),
      CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))
    )
  `.execute(db);
  // The same source can give access only once (a redemption, a shared-code use, the trial of one account).
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS entitlements_source_once
      ON entitlements (kind, source_ref) WHERE source_ref IS NOT NULL
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS entitlements_account ON entitlements (account_id, ends_at DESC) WHERE account_id IS NOT NULL`.execute(db);

  await sql`
    CREATE OR REPLACE FUNCTION entitlements_guard() RETURNS trigger AS $fn$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'entitlements cannot be deleted' USING ERRCODE = '23000';
      END IF;
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.kind IS DISTINCT FROM OLD.kind
         OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
         OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
         OR NEW.source_ref IS DISTINCT FROM OLD.source_ref
         OR NEW.reason IS DISTINCT FROM OLD.reason
         OR NEW.created_by IS DISTINCT FROM OLD.created_by
         OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'entitlements cannot be changed' USING ERRCODE = '23000';
      END IF;
      -- The link to the reader may only be cut (account deleted), never moved or made.
      IF NEW.account_id IS DISTINCT FROM OLD.account_id AND NOT (NEW.account_id IS NULL AND OLD.account_id IS NOT NULL) THEN
        RAISE EXCEPTION 'entitlements cannot be moved to another account' USING ERRCODE = '23000';
      END IF;
      -- A cancellation is final and cannot be taken back or rewritten.
      IF OLD.revoked_at IS NOT NULL AND (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR NEW.revoked_by IS DISTINCT FROM OLD.revoked_by OR NEW.revoke_reason IS DISTINCT FROM OLD.revoke_reason) THEN
        RAISE EXCEPTION 'a cancelled entitlement cannot be changed' USING ERRCODE = '23000';
      END IF;
      RETURN NEW;
    END
    $fn$ LANGUAGE plpgsql
  `.execute(db);
  await sql`DROP TRIGGER IF EXISTS entitlements_guard_trg ON entitlements`.execute(db);
  await sql`
    CREATE TRIGGER entitlements_guard_trg BEFORE UPDATE OR DELETE ON entitlements
      FOR EACH ROW EXECUTE FUNCTION entitlements_guard()
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS entitlements_guard_trg ON entitlements`.execute(db);
  await sql`DROP TABLE IF EXISTS entitlements`.execute(db);
  await sql`DROP FUNCTION IF EXISTS entitlements_guard()`.execute(db);
}
