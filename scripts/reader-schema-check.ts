/**
 * Checks the reader account tables (migration 027) against a real database. Everything runs inside one transaction that is rolled
 * back, so nothing is left behind. Local work only reaches the development branch (src/lib/db/env.ts), so this cannot touch production.
 * Run: npx tsx scripts/reader-schema-check.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { up as migrate027 } from "../src/lib/db/migrations/027_reader_accounts";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

class Rollback extends Error {}

/** A statement that must be refused by the database. Savepoints keep the outer transaction usable after each failure. */
async function refuses(trx: any, label: string, run: () => Promise<unknown>, code?: string) {
  await sql`SAVEPOINT s`.execute(trx);
  try {
    await run();
    await sql`RELEASE SAVEPOINT s`.execute(trx);
    assert(false, `${label} (was accepted)`);
  } catch (error) {
    await sql`ROLLBACK TO SAVEPOINT s`.execute(trx);
    const actual = (error as { code?: string }).code;
    assert(!code || actual === code, label, actual);
  }
}

async function main() {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      const work = await sql<{ id: string }>`SELECT id FROM works ORDER BY id LIMIT 1`.execute(trx);
      const workId = work.rows[0]?.id;
      if (!workId) throw new Error("No work in the database to test the foreign keys with.");

      // Accounts.
      const first = await sql<{ id: string }>`
        INSERT INTO reader_accounts (email, email_normalized) VALUES ('Aku@Contoh.my', 'aku@contoh.my') RETURNING id`.execute(trx);
      const accountId = first.rows[0].id;
      assert(/^[0-9a-f-]{36}$/.test(accountId), "an account gets a UUID");
      await refuses(trx, "a second live account with the same address is refused", () =>
        sql`INSERT INTO reader_accounts (email, email_normalized) VALUES ('aku@contoh.my', 'aku@contoh.my')`.execute(trx), "23505");
      await refuses(trx, "an unknown status is refused", () =>
        sql`INSERT INTO reader_accounts (email, email_normalized, status) VALUES ('b@contoh.my', 'b@contoh.my', 'banned')`.execute(trx), "23514");
      await refuses(trx, "a trial that ends before it starts is refused", () =>
        sql`INSERT INTO reader_accounts (email, email_normalized, trial_starts_at, trial_ends_at)
            VALUES ('c@contoh.my', 'c@contoh.my', now(), now() - interval '1 day')`.execute(trx), "23514");
      await sql`UPDATE reader_accounts SET status = 'deleted' WHERE id = ${accountId}`.execute(trx);
      await sql`INSERT INTO reader_accounts (email, email_normalized) VALUES ('aku@contoh.my', 'aku@contoh.my')`.execute(trx);
      assert(true, "a deleted account frees its address for a new account");
      const live = await sql<{ id: string }>`SELECT id FROM reader_accounts WHERE email_normalized = 'aku@contoh.my' AND status = 'active'`.execute(trx);
      const liveId = live.rows[0].id;

      // Trial claims.
      await sql`INSERT INTO reader_trial_claims (email_mac, key_id) VALUES ('mac-1', 'k1')`.execute(trx);
      await refuses(trx, "the same address cannot claim a second trial", () =>
        sql`INSERT INTO reader_trial_claims (email_mac, key_id) VALUES ('mac-1', 'k1')`.execute(trx), "23505");

      // Sign-in challenges.
      await sql`INSERT INTO reader_auth_challenges (email_lookup_mac, otp_mac, key_id, expires_at)
                VALUES ('lm-1', 'om-1', 'k1', now() + interval '5 minutes')`.execute(trx);
      await refuses(trx, "only one unused challenge per address and purpose", () =>
        sql`INSERT INTO reader_auth_challenges (email_lookup_mac, otp_mac, key_id, expires_at)
            VALUES ('lm-1', 'om-2', 'k1', now() + interval '5 minutes')`.execute(trx), "23505");
      await sql`UPDATE reader_auth_challenges SET consumed_at = now() WHERE email_lookup_mac = 'lm-1'`.execute(trx);
      await sql`INSERT INTO reader_auth_challenges (email_lookup_mac, otp_mac, key_id, expires_at)
                VALUES ('lm-1', 'om-2', 'k1', now() + interval '5 minutes')`.execute(trx);
      assert(true, "a new challenge is allowed once the old one is used");
      await refuses(trx, "more than 5 attempts are refused", () =>
        sql`UPDATE reader_auth_challenges SET attempt_count = 6 WHERE otp_mac = 'om-2'`.execute(trx), "23514");
      await refuses(trx, "a challenge that expires before it was made is refused", () =>
        sql`INSERT INTO reader_auth_challenges (email_lookup_mac, otp_mac, key_id, expires_at)
            VALUES ('lm-2', 'om-3', 'k1', now() - interval '1 minute')`.execute(trx), "23514");

      // Devices.
      await sql`INSERT INTO reader_devices (account_id, token_hash, label) VALUES (${liveId}, 'th-1', 'Telefon')`.execute(trx);
      await refuses(trx, "a device token hash is unique", () =>
        sql`INSERT INTO reader_devices (account_id, token_hash) VALUES (${liveId}, 'th-1')`.execute(trx), "23505");
      await refuses(trx, "an unknown revoke reason is refused", () =>
        sql`UPDATE reader_devices SET revoked_at = now(), revoked_reason = 'because' WHERE token_hash = 'th-1'`.execute(trx), "23514");
      await refuses(trx, "a device needs a real account", () =>
        sql`INSERT INTO reader_devices (account_id, token_hash) VALUES ('00000000-0000-0000-0000-000000000000', 'th-9')`.execute(trx), "23503");

      // Preferences.
      await sql`INSERT INTO reader_prefs (account_id) VALUES (${liveId})`.execute(trx);
      const prefs = await sql<{ font_size_px: number; theme: string; dim_percent: number }>`SELECT * FROM reader_prefs WHERE account_id = ${liveId}`.execute(trx);
      assert(prefs.rows[0].font_size_px === 18 && prefs.rows[0].theme === "cerah" && prefs.rows[0].dim_percent === 0, "preferences start at size 18, light theme, no dimming");
      await refuses(trx, "a font size that is not offered is refused", () =>
        sql`UPDATE reader_prefs SET font_size_px = 19 WHERE account_id = ${liveId}`.execute(trx), "23514");
      await refuses(trx, "dimming in steps other than 5 is refused", () =>
        sql`UPDATE reader_prefs SET dim_percent = 7 WHERE account_id = ${liveId}`.execute(trx), "23514");
      await sql`UPDATE reader_prefs SET dim_percent = 15, theme = 'gelap' WHERE account_id = ${liveId}`.execute(trx);
      assert(true, "dimming of 15% and the dark theme are accepted");

      // Saved works and reading progress.
      await sql`INSERT INTO saved_works (account_id, work_id) VALUES (${liveId}, ${workId})`.execute(trx);
      await refuses(trx, "a work can be saved only once per account", () =>
        sql`INSERT INTO saved_works (account_id, work_id) VALUES (${liveId}, ${workId})`.execute(trx), "23505");
      await refuses(trx, "saving a work that does not exist is refused", () =>
        sql`INSERT INTO saved_works (account_id, work_id) VALUES (${liveId}, 'JLN-TIADA-0000')`.execute(trx), "23503");
      await sql`INSERT INTO reading_progress (account_id, work_id, section_slug) VALUES (${liveId}, ${workId}, 'bab-1')`.execute(trx);
      await refuses(trx, "one progress row per work", () =>
        sql`INSERT INTO reading_progress (account_id, work_id) VALUES (${liveId}, ${workId})`.execute(trx), "23505");

      // Deleting an account removes everything it kept.
      await sql`DELETE FROM reader_accounts WHERE id = ${liveId}`.execute(trx);
      const left = await sql<{ n: string }>`
        SELECT (SELECT count(*) FROM reader_devices WHERE account_id = ${liveId})
             + (SELECT count(*) FROM reader_prefs WHERE account_id = ${liveId})
             + (SELECT count(*) FROM saved_works WHERE account_id = ${liveId})
             + (SELECT count(*) FROM reading_progress WHERE account_id = ${liveId}) AS n`.execute(trx);
      assert(Number(left.rows[0].n) === 0, "deleting an account removes its devices, preferences, saved works and progress");

      // The migration can be run again without harm.
      await migrate027(trx as never);
      assert(true, "running the migration again changes nothing and raises no error");

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) {
      failed++;
      console.error("  ✗ unexpected error:", error);
    }
  } finally {
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed (nothing was saved)`);
  if (failed) process.exit(1);
}

void main();
