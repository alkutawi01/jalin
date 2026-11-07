import type { Kysely } from "kysely";
import { sql } from "kysely";

/** Recoverable physical labels only; existing codes remain valid and their nullable storage stays empty. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE redeem_codes ADD COLUMN IF NOT EXISTS label_cipher text`.execute(db);
  await sql`ALTER TABLE redeem_codes ADD COLUMN IF NOT EXISTS label_key_id text`.execute(db);
  await sql`ALTER TABLE code_batches ADD COLUMN IF NOT EXISTS label_layout jsonb`.execute(db);
  await sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'redeem_codes'::regclass AND conname = 'redeem_codes_label_pair') THEN
      ALTER TABLE redeem_codes ADD CONSTRAINT redeem_codes_label_pair CHECK ((label_cipher IS NULL) = (label_key_id IS NULL));
    END IF;
  END $$`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE redeem_codes DROP CONSTRAINT IF EXISTS redeem_codes_label_pair`.execute(db);
  await sql`ALTER TABLE redeem_codes DROP COLUMN IF EXISTS label_cipher, DROP COLUMN IF EXISTS label_key_id`.execute(db);
  await sql`ALTER TABLE code_batches DROP COLUMN IF EXISTS label_layout`.execute(db);
}
