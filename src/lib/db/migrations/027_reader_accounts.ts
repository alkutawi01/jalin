import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Reader accounts (study: docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md, sections 5.2 and 14 to 16). Phase 2: who can sign in, on
 * which devices, the 14-day trial, and what an account keeps (settings, saved works, the chapter last read). The subscription
 * ledger, redeem codes and shared codes are later phases and are not here. Nothing here is used by any page yet.
 *
 * Additive: new tables only; no existing table or column is touched. Idempotent (IF NOT EXISTS). Reader accounts are separate
 * from admin_users and share nothing with the admin session.
 *
 * Decisions this encodes: sign-in by one-time e-mail code only (no password column); at most two active devices per account;
 * one trial per e-mail even after an account is deleted (the claim keeps only a keyed hash, never the address); continue
 * reading remembers the chapter, not the paragraph.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS reader_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      email_normalized text NOT NULL,
      display_name text,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deletion_requested', 'deleted')),
      email_verified_at timestamptz,
      trial_starts_at timestamptz,
      trial_ends_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_login_at timestamptz,
      deletion_requested_at timestamptz,
      CHECK (trial_ends_at IS NULL OR trial_starts_at IS NULL OR trial_ends_at > trial_starts_at)
    )
  `.execute(db);
  // One live account per address. A deleted account frees its address (its row keeps no usable e-mail once purged).
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS reader_accounts_email_live
      ON reader_accounts (email_normalized) WHERE status <> 'deleted'
  `.execute(db);

  // The trial is given once per e-mail, for good. Only a keyed hash of the normalised address is kept so deleting an account
  // does not leave the address behind and does not give a second trial on re-registration.
  await sql`
    CREATE TABLE IF NOT EXISTS reader_trial_claims (
      email_mac text PRIMARY KEY,
      key_id text NOT NULL,
      claimed_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);

  // A sign-in code sent by e-mail. Only keyed hashes are stored: of the address (to look the challenge up) and of the code.
  await sql`
    CREATE TABLE IF NOT EXISTS reader_auth_challenges (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email_lookup_mac text NOT NULL,
      otp_mac text NOT NULL,
      key_id text NOT NULL,
      purpose text NOT NULL DEFAULT 'login' CHECK (purpose IN ('login')),
      attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      CHECK (expires_at > created_at)
    )
  `.execute(db);
  // At most one unused challenge per address and purpose; a new request must retire the old one first.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS reader_auth_challenges_one_open
      ON reader_auth_challenges (email_lookup_mac, purpose) WHERE consumed_at IS NULL
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS reader_auth_challenges_expiry ON reader_auth_challenges (expires_at)`.execute(db);

  // One row per signed-in device. The cookie holds a random token; only its hash is stored. Staying signed in has no fixed expiry
  // (the reader signs out, or removes the device); the two-device limit is enforced in the sign-in transaction under a lock on
  // the account row, and revoked rows are kept for the record.
  await sql`
    CREATE TABLE IF NOT EXISTS reader_devices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id uuid NOT NULL REFERENCES reader_accounts(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      label text NOT NULL DEFAULT 'Peranti',
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      revoked_reason text CHECK (revoked_reason IN ('signed_out', 'replaced', 'sign_out_all', 'account_deleted', 'security'))
    )
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS reader_devices_active ON reader_devices (account_id) WHERE revoked_at IS NULL
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS reader_prefs (
      account_id uuid PRIMARY KEY REFERENCES reader_accounts(id) ON DELETE CASCADE,
      font_size_px smallint NOT NULL DEFAULT 18 CHECK (font_size_px IN (16, 18, 20, 22, 24)),
      line_height_x100 smallint NOT NULL DEFAULT 175 CHECK (line_height_x100 IN (150, 175, 200)),
      text_width_ch smallint NOT NULL DEFAULT 68 CHECK (text_width_ch IN (60, 68, 74)),
      theme text NOT NULL DEFAULT 'cerah' CHECK (theme IN ('cerah', 'sepia', 'gelap')),
      font_family text NOT NULL DEFAULT 'serif' CHECK (font_family IN ('serif', 'sans')),
      dim_percent smallint NOT NULL DEFAULT 0 CHECK (dim_percent BETWEEN 0 AND 20 AND dim_percent % 5 = 0),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS saved_works (
      account_id uuid NOT NULL REFERENCES reader_accounts(id) ON DELETE CASCADE,
      work_id text NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      saved_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (account_id, work_id)
    )
  `.execute(db);

  // Continue reading: the chapter last opened in each work, one row per work. A work without chapters has no section.
  await sql`
    CREATE TABLE IF NOT EXISTS reading_progress (
      account_id uuid NOT NULL REFERENCES reader_accounts(id) ON DELETE CASCADE,
      work_id text NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      section_slug text,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (account_id, work_id)
    )
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS reading_progress_recent ON reading_progress (account_id, updated_at DESC)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS reading_progress`.execute(db);
  await sql`DROP TABLE IF EXISTS saved_works`.execute(db);
  await sql`DROP TABLE IF EXISTS reader_prefs`.execute(db);
  await sql`DROP TABLE IF EXISTS reader_devices`.execute(db);
  await sql`DROP TABLE IF EXISTS reader_auth_challenges`.execute(db);
  await sql`DROP TABLE IF EXISTS reader_trial_claims`.execute(db);
  await sql`DROP TABLE IF EXISTS reader_accounts`.execute(db);
}
