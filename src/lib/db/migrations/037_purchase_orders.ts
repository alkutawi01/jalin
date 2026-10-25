import type { Kysely } from "kysely";
import { sql } from "kysely";

/**
 * Orders for a virtual code bought on the site (Izzat, 25 Oct 2026): the reader chooses a length, pays through the payment gateway
 * (Billplz first), and a code is made and e-mailed. The gateway only takes and confirms the money; the code, the period and the
 * redemption stay in the code tables (migrations 030 and 036).
 *
 *  - One order, one code: the code is made only when the order moves from PENDING to PAID, in one transaction, so a gateway that calls
 *    back twice (it does retry) cannot make two.
 *  - The plain code is not kept. Until the e-mail has gone, it is kept ENCRYPTED in code_cipher (AES-256-GCM, a key derived from the
 *    code key, bound to the order reference) so a failed e-mail can be sent again without making another code; once sent, it is erased.
 *  - delivery_status: NONE (not paid), PENDING (paid, e-mail not sent yet or failed, will be tried again), SENT.
 *
 * Additive and idempotent. Nothing reads this table until purchases are switched on (PURCHASES_ENABLED).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      reference text NOT NULL,
      months smallint NOT NULL CHECK (months IN (1, 6, 12)),
      amount_sen integer NOT NULL CHECK (amount_sen > 0),
      email text NOT NULL,
      status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
      provider text NOT NULL DEFAULT 'billplz',
      provider_bill_id text,
      paid_at timestamptz,
      paid_amount_sen integer,
      code_id uuid REFERENCES redeem_codes(id),
      serial text,
      code_cipher text,
      delivery_status text NOT NULL DEFAULT 'NONE' CHECK (delivery_status IN ('NONE', 'PENDING', 'SENT')),
      delivery_attempts integer NOT NULL DEFAULT 0,
      last_attempt_at timestamptz,
      last_delivery_error text,
      delivered_at timestamptz,
      note text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK ((delivery_status = 'SENT') = (delivered_at IS NOT NULL)),
      CHECK (delivery_status <> 'SENT' OR code_cipher IS NULL)
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_reference ON purchase_orders (reference)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_bill ON purchase_orders (provider, provider_bill_id) WHERE provider_bill_id IS NOT NULL`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_code ON purchase_orders (code_id) WHERE code_id IS NOT NULL`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS purchase_orders_waiting ON purchase_orders (delivery_status, last_attempt_at) WHERE delivery_status = 'PENDING'`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS purchase_orders_email ON purchase_orders (email, created_at)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS purchase_orders`.execute(db);
}
