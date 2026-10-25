import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Where a card code came from, and the last day it can be redeemed (Izzat, 25 Oct 2026).
 *
 *  - code_batches.channel: 'physical' (a printed card, serial JLN-12B0126-F01) or 'virtual' (a code e-mailed after payment, serial
 *    JLN-12B0126-M01). Existing rows are physical.
 *  - redeem_codes.redeem_by: the moment (exclusive) after which the code can no longer be redeemed, i.e. the start of the day after the
 *    last valid day, on the Malaysian clock. NULL means no limit, which is how codes made before this migration behave. A redeemed code
 *    keeps working for its owner (the access period it gave is not shortened by this date).
 *
 * Additive and idempotent: two columns, one CHECK. Nothing is back-filled and nothing is removed.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE code_batches ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'physical'`.execute(db);
  await sql`ALTER TABLE code_batches DROP CONSTRAINT IF EXISTS code_batches_channel_check`.execute(db);
  await sql`ALTER TABLE code_batches ADD CONSTRAINT code_batches_channel_check CHECK (channel IN ('physical', 'virtual'))`.execute(db);
  await sql`ALTER TABLE redeem_codes ADD COLUMN IF NOT EXISTS redeem_by timestamptz`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE redeem_codes DROP COLUMN IF EXISTS redeem_by`.execute(db);
  await sql`ALTER TABLE code_batches DROP CONSTRAINT IF EXISTS code_batches_channel_check`.execute(db);
  await sql`ALTER TABLE code_batches DROP COLUMN IF EXISTS channel`.execute(db);
}
