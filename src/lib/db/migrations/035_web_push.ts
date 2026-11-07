import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Web Push: a reader who pressed "Aktifkan notifikasi" in the browser (docs/NOTIFIKASI_TOLAK.md).
 *
 *  push_config         the VAPID key pair (made once, on first use, when the environment does not carry one) and other settings
 *  push_subscriptions  one row per browser subscription: the push service's address and the two keys, the reader's time zone,
 *                      and a count of failures in a row (a subscription is removed after five, or at once on 404 or 410)
 *  push_deliveries     which work was told to which subscription: the primary key is what makes a work notified once, ever
 *  push_sends          one row per notification sent (a batch counts as one): the minimum gap and the daily cap read it
 *
 * The on/off switch lives in reader_switches (key push_on), so the owner can stop everything from the admin without a deploy.
 * Additive and idempotent. Nothing is back-filled: a new subscription is seeded silently when it is made.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS push_config (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id text PRIMARY KEY,
      endpoint text NOT NULL UNIQUE,
      p256dh text NOT NULL,
      auth text NOT NULL,
      time_zone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
      failures integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_sent_at timestamptz
    )`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS push_deliveries (
      subscription_id text NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
      work_id text NOT NULL,
      delivered_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (subscription_id, work_id)
    )`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS push_sends (
      id bigserial PRIMARY KEY,
      subscription_id text NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
      sent_at timestamptz NOT NULL DEFAULT now(),
      item_count integer NOT NULL DEFAULT 1
    )`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS push_sends_subscription_sent_idx ON push_sends (subscription_id, sent_at DESC)`.execute(db);
}
