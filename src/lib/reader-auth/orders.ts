/**
 * Orders for a virtual code bought on the site: pay, then a code is made and e-mailed (migration 037, docs/KAJIAN_PENYEDIA_BAYARAN.md).
 *
 * The rules this file keeps:
 *  - One paid order makes exactly one code. The code is made only when the order moves PENDING to PAID, inside one transaction on the
 *    locked order row, so a gateway that calls back twice (or two calls at once) cannot make a second.
 *  - Only the gateway's confirmed call (its signature checked by the caller) can pay an order. A redirect back to the site proves nothing.
 *  - The amount paid must reach the amount asked; otherwise no code is made and the order is left for a person.
 *  - The plain code is never stored; until the e-mail goes it waits encrypted (order-crypto.ts) and is erased once sent.
 *  - A failed e-mail is tried again without making another code. Two tries at the same moment cannot both send: a try claims the order
 *    first (a short cool-down), and only the one that claimed it sends.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { Database } from "../db/types";
import { decryptOrderCode, encryptOrderCode } from "../subscription/order-crypto";
import type { PaymentProvider } from "../subscription/prices";
import { purchaseMessage } from "../subscription/order-email";
import { formatCode, generateCodeBody, redeemByLabel } from "../subscription/redeem-code";
import type { MacKey, Mailer } from "./primitives";
import { issueVirtualCode } from "./redeem";
import type { Db } from "./service";

async function inTransaction<T>(db: Db, run: (trx: Db) => Promise<T>): Promise<T> {
  return db.isTransaction ? run(db) : (db as Kysely<Database>).transaction().execute((trx) => run(trx));
}

/** The number a buyer sees and quotes: JP- and ten characters of the same alphabet as the codes. */
export function newOrderReference(): string {
  return `JP-${generateCodeBody(10)}`;
}

export async function createOrder(db: Db, input: { months: 1 | 6 | 12; email: string; amountSen: number; provider?: PaymentProvider }): Promise<{ id: string; reference: string }> {
  if (![1, 6, 12].includes(input.months)) throw new Error("A code is for 1, 6 or 12 months.");
  if (!Number.isInteger(input.amountSen) || input.amountSen < 100) throw new Error("The amount must be at least RM1.00 (in sen).");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db
        .insertInto("purchase_orders")
        .values({ reference: newOrderReference(), months: input.months, amount_sen: input.amountSen, email: input.email, provider: input.provider ?? "billplz" })
        .returning(["id", "reference"])
        .executeTakeFirstOrThrow();
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  throw new Error("Could not make a unique order number.");
}

export async function attachBill(db: Db, orderId: string, billId: string): Promise<void> {
  await db.updateTable("purchase_orders").set({ provider_bill_id: billId }).where("id", "=", orderId).where("provider_bill_id", "is", null).execute();
}

/** An order whose bill could not be made: nobody paid, so it is closed. A PAID order is never touched. */
export async function cancelOrder(db: Db, orderId: string, note: string): Promise<void> {
  await db.updateTable("purchase_orders").set({ status: "CANCELLED", note: note.slice(0, 200) }).where("id", "=", orderId).where("status", "=", "PENDING").execute();
}

export async function countRecentOrdersByEmail(db: Db, email: string, since: Date): Promise<number> {
  const row = await db.selectFrom("purchase_orders").select(sql<string>`count(*)`.as("n")).where("email", "=", email).where("created_at", ">=", since).executeTakeFirst();
  return Number(row?.n ?? 0);
}

export type FulfilResult =
  | { status: "issued"; orderId: string }
  | { status: "already"; orderId: string }
  | { status: "unknown" }
  | { status: "amount_mismatch"; orderId: string }
  | { status: "cancelled_paid"; orderId: string }
  | { status: "test_payment"; orderId: string };

/** The gateway says this bill is paid (signature already checked). Makes the code once, and keeps it encrypted for the e-mail. */
export async function fulfilPaidOrder(db: Db, deps: { codeKey: MacKey; now?: Date; allowTestPayments?: boolean }, input: { billId: string; paidAmountSen: number | null; provider?: PaymentProvider; isTest?: boolean }): Promise<FulfilResult> {
  const now = deps.now ?? new Date();
  return inTransaction(db, async (trx): Promise<FulfilResult> => {
    const order = await trx.selectFrom("purchase_orders").selectAll().where("provider", "=", input.provider ?? "billplz").where("provider_bill_id", "=", input.billId).forUpdate().executeTakeFirst();
    if (!order) return { status: "unknown" };
    if (order.status === "PAID") return { status: "already", orderId: order.id };
    if (order.status === "CANCELLED") {
      await trx.updateTable("purchase_orders").set({ note: "Dibayar selepas pesanan dibatalkan: semak dengan tangan." }).where("id", "=", order.id).execute();
      return { status: "cancelled_paid", orderId: order.id };
    }
    // A payment made with a test key moves no money. It must not make a code that works for real, unless testing is on purpose.
    if (input.isTest && !deps.allowTestPayments) {
      await trx.updateTable("purchase_orders").set({ note: "Pembayaran ujian (kunci ujian gerbang): tiada kod dibuat." }).where("id", "=", order.id).execute();
      return { status: "test_payment", orderId: order.id };
    }
    if (input.paidAmountSen === null || input.paidAmountSen < order.amount_sen) {
      await trx.updateTable("purchase_orders").set({ note: `Jumlah dibayar (${input.paidAmountSen ?? "tiada"} sen) kurang daripada ${order.amount_sen} sen: tiada kod dibuat. Semak dengan tangan.` }).where("id", "=", order.id).execute();
      return { status: "amount_mismatch", orderId: order.id };
    }
    const made = await issueVirtualCode(trx, { codeKey: deps.codeKey, now }, { months: order.months as 1 | 6 | 12, createdBy: `pesanan ${order.reference}` });
    const code = await trx.selectFrom("redeem_codes").select("id").where("serial", "=", made.serial).executeTakeFirstOrThrow();
    await trx
      .updateTable("purchase_orders")
      .set({
        status: "PAID", paid_at: now, paid_amount_sen: input.paidAmountSen, code_id: code.id, serial: made.serial,
        code_cipher: encryptOrderCode(deps.codeKey.key, order.reference, made.canonical), delivery_status: "PENDING",
      })
      .where("id", "=", order.id)
      .execute();
    return { status: "issued", orderId: order.id };
  });
}

const COOL_DOWN_MS = 30 * 1000;

export type DeliveryDeps = { codeKey: MacKey; mailer: Mailer; siteUrl: string; now?: Date };

/**
 * Send the e-mail of a paid order. Safe to call from anywhere, any number of times: it does nothing for an order that has no code to
 * send, was sent already, or was tried in the last half minute. Returns what happened.
 */
export async function deliverOrder(db: Db, deps: DeliveryDeps, orderId: string): Promise<"sent" | "failed" | "skipped"> {
  const now = deps.now ?? new Date();
  const claimed = await db
    .updateTable("purchase_orders")
    .set({ delivery_attempts: sql<number>`delivery_attempts + 1`, last_attempt_at: now })
    .where("id", "=", orderId)
    .where("delivery_status", "=", "PENDING")
    .where("code_cipher", "is not", null)
    .where(sql<boolean>`(last_attempt_at IS NULL OR last_attempt_at < ${new Date(now.getTime() - COOL_DOWN_MS)})`)
    .returning(["id", "reference", "email", "months", "serial", "code_cipher", "code_id"])
    .executeTakeFirst();
  if (!claimed || !claimed.code_cipher || !claimed.serial || !claimed.code_id) return "skipped";
  try {
    const canonical = decryptOrderCode(deps.codeKey.key, claimed.reference, claimed.code_cipher);
    const code = await db.selectFrom("redeem_codes").select("redeem_by").where("id", "=", claimed.code_id).executeTakeFirstOrThrow();
    if (!code.redeem_by) throw new Error("The code has no redeem-by date.");
    const message = purchaseMessage({
      serial: claimed.serial, code: formatCode(canonical), months: claimed.months as 1 | 6 | 12, redeemByLabel: redeemByLabel(code.redeem_by),
      orderReference: claimed.reference, redeemUrl: `${deps.siteUrl}/tebus`,
    });
    await deps.mailer.sendMessage({ to: claimed.email, ...message });
  } catch (error) {
    // The error text is kept for the admin, so it must never hold a code: only the message of the thrower, cut short.
    await db.updateTable("purchase_orders").set({ last_delivery_error: String((error as Error)?.message ?? "Gagal").replace(/[0-9A-Z]{4}(-[0-9A-Z]{4}){3}-[0-9A-Z]/g, "[kod]").slice(0, 200) }).where("id", "=", orderId).execute();
    return "failed";
  }
  await db.updateTable("purchase_orders").set({ delivery_status: "SENT", delivered_at: now, code_cipher: null, last_delivery_error: null }).where("id", "=", orderId).execute();
  return "sent";
}

/** Try again for every paid order whose e-mail has not gone yet (oldest first). */
export async function retryPendingDeliveries(db: Db, deps: DeliveryDeps, limit = 10): Promise<{ tried: number; sent: number }> {
  const rows = await db.selectFrom("purchase_orders").select("id").where("delivery_status", "=", "PENDING").orderBy("paid_at", "asc").limit(limit).execute();
  let sent = 0;
  for (const row of rows) if ((await deliverOrder(db, deps, row.id)) === "sent") sent++;
  return { tried: rows.length, sent };
}

/** What the buyer's "thank you" page may show: nothing secret, and only a hint of the address. */
export async function orderPublicStatus(db: Db, reference: string): Promise<{ found: false } | { found: true; status: "PENDING" | "PAID" | "CANCELLED"; delivery: "NONE" | "PENDING" | "SENT"; months: number; emailHint: string; orderId: string }> {
  if (!/^JP-[0-9A-Z]{10}$/.test(reference)) return { found: false };
  const row = await db.selectFrom("purchase_orders").select(["id", "status", "delivery_status", "months", "email"]).where("reference", "=", reference).executeTakeFirst();
  if (!row) return { found: false };
  const [local, domain] = row.email.split("@");
  return { found: true, status: row.status, delivery: row.delivery_status, months: row.months, emailHint: `${local.slice(0, 2)}***@${domain}`, orderId: row.id };
}

export type OrderRow = {
  id: string; reference: string; months: number; amountSen: number; email: string; status: string; deliveryStatus: string; deliveryAttempts: number;
  lastDeliveryError: string | null; serial: string | null; createdAt: Date; paidAt: Date | null; deliveredAt: Date | null; note: string | null;
};

export async function listOrders(db: Db, limit = 200): Promise<OrderRow[]> {
  const rows = await db.selectFrom("purchase_orders").selectAll().orderBy("created_at", "desc").limit(limit).execute();
  return rows.map((r) => ({
    id: r.id, reference: r.reference, months: r.months, amountSen: r.amount_sen, email: r.email, status: r.status, deliveryStatus: r.delivery_status, deliveryAttempts: r.delivery_attempts,
    lastDeliveryError: r.last_delivery_error, serial: r.serial, createdAt: r.created_at, paidAt: r.paid_at, deliveredAt: r.delivered_at, note: r.note,
  }));
}
