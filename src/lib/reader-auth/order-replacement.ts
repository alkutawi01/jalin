import type { Kysely } from "kysely";
import type { Database } from "../db/types";
import { encryptOrderCode } from "../subscription/order-crypto";
import type { MacKey } from "./primitives";
import { replaceCode } from "./redeem";
import type { Db } from "./service";

export type OrderReplacementResult =
  | { status: "replaced" }
  | { status: "unknown" | "changed" | "not_ready" | "unavailable" | "expired" };

/** Owner-only caller; no secrets returned. The audit is mandatory and commits with the replacement. */
export async function replaceOrderCode(
  db: Db,
  deps: { codeKey: MacKey; now?: Date },
  input: { orderId: string; expectedSerial: string; reason: string; actor: { id: string; name: string } },
): Promise<OrderReplacementResult> {
  const reason = input.reason.trim();
  if (!reason || reason.length > 160 || !input.actor.id.trim() || !input.actor.name.trim()) {
    throw new Error("A reason and an identified owner are required.");
  }
  const run = async (trx: Db): Promise<OrderReplacementResult> => {
    const order = await trx.selectFrom("purchase_orders").selectAll().where("id", "=", input.orderId).forUpdate().executeTakeFirst();
    if (!order) return { status: "unknown" };
    // A second click or an old tab must never revoke the replacement from a previous request.
    if (!order.serial || order.serial !== input.expectedSerial) return { status: "changed" };
    if (order.status !== "PAID" || order.delivery_status !== "SENT" || order.code_cipher !== null || !order.code_id) return { status: "not_ready" };
    const code = await trx.selectFrom("redeem_codes as c")
      .innerJoin("code_batches as b", "b.id", "c.batch_id")
      .leftJoin("redemptions as r", "r.code_id", "c.id")
      .select(["c.serial", "c.state", "c.redeem_by", "b.channel", "b.months", "b.status as batch_status", "b.quantity", "r.id as redemption"])
      .where("c.id", "=", order.code_id).forUpdate("c").executeTakeFirst();
    if (!code || code.serial !== order.serial || code.channel !== "virtual" || code.months !== order.months ||
        code.state !== "issued" || code.redemption || code.batch_status !== "PRINT_CONFIRMED" || code.quantity >= 5000) return { status: "unavailable" };
    // Read the real clock after locks; a queued request cannot extend a deadline it has just passed.
    const now = deps.now ?? new Date();
    if (!code.redeem_by || code.redeem_by <= now) return { status: "expired" };
    const made = await replaceCode(trx, { codeKey: deps.codeKey, now }, { serial: order.serial, reason });
    const replacement = await trx.selectFrom("redeem_codes").select("id").where("serial", "=", made.serial).executeTakeFirstOrThrow();
    await trx.updateTable("purchase_orders").set({
      code_id: replacement.id, serial: made.serial, code_cipher: encryptOrderCode(deps.codeKey.key, order.reference, made.canonical),
      delivery_status: "PENDING", delivered_at: null, delivery_attempts: 0, last_attempt_at: null, last_delivery_error: null,
    }).where("id", "=", order.id).execute();
    await trx.insertInto("admin_activity").values({
      at: now, actor_id: input.actor.id, actor_name: input.actor.name.trim().slice(0, 120), actor_role: "owner",
      action: "subscription.order.replace", subject_type: "order", subject_id: order.id, work_id: null,
      summary: `${order.reference}: ${order.serial} → ${made.serial}. Sebab: ${reason}`,
    }).execute();
    return { status: "replaced" };
  };
  return db.isTransaction ? run(db) : (db as Kysely<Database>).transaction().execute(run);
}
