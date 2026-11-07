/** Development only, one rolled-back transaction; mail is captured in memory, never sent or logged. */
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { Database } from "../src/lib/db/types";
import { migrationConnection, migrationFailureMessage } from "../src/lib/db/migration-connection";
import { loadMigrationEnvironment } from "./lib/migration-env";
import { attachBill, createOrder, deliverOrder, fulfilPaidOrder, listOrders, orderPublicStatus } from "../src/lib/reader-auth/orders";
import { replaceOrderCode } from "../src/lib/reader-auth/order-replacement";
import { decryptOrderCode } from "../src/lib/subscription/order-crypto";
import { formatCode } from "../src/lib/subscription/redeem-code";
import { redeemCode, setRedeemHalted } from "../src/lib/reader-auth/redeem";
import type { Db } from "../src/lib/reader-auth/service";
import type { Mailer } from "../src/lib/reader-auth/primitives";

class CheckFailure extends Error {}
class Rollback extends Error {}
let passed = 0;
function check(value: unknown, message: string): asserts value {
  if (!value) throw new CheckFailure(message);
  passed++; console.log(`ok: ${message}`);
}
const codeKey = { keyId: `qa-${randomUUID()}`, key: randomBytes(32) };
const actor = { id: `fixture-${randomUUID()}`, name: "QA fixture" };
const now = new Date();
const at = (seconds: number) => new Date(now.getTime() + seconds * 1000);
const orderIds: string[] = [];
const accountIds: string[] = [];
const mailer: Mailer = { name: "memory", async sendLoginCode() {}, async sendMessage() {} };
const delivery = { codeKey, mailer, siteUrl: "https://example.invalid", now };
const replacement = (db: Db, id: string, serial: string, time = now) => replaceOrderCode(db, { codeKey, now: time }, { orderId: id, expectedSerial: serial, reason: "Fixture lost message", actor });
const row = (db: Db, id: string) => db.selectFrom("purchase_orders").selectAll().where("id", "=", id).executeTakeFirstOrThrow();

async function paid(db: Db, months: 1 | 6 | 12 = 6, sent = true) {
  const order = await createOrder(db, { months, email: `fixture-${randomUUID()}@e2e.invalid`, amountSen: 3000, provider: "chip" });
  orderIds.push(order.id);
  const bill = randomUUID();
  await attachBill(db, order.id, bill);
  check((await fulfilPaidOrder(db, { codeKey, now }, { billId: bill, paidAmountSen: 3000, provider: "chip" })).status === "issued", "fixture payment confirmation issues one code without a gateway call");
  const original = await row(db, order.id);
  check(original.code_cipher && original.serial && original.code_id, "fixture code is encrypted before sending");
  const canonical = decryptOrderCode(codeKey.key, order.reference, original.code_cipher);
  if (sent) check(await deliverOrder(db, delivery, order.id) === "sent", "fixture mail is accepted only by the in-memory mailer");
  return { order, original, canonical };
}

async function checks(db: Kysely<Database>) {
  try {
    await db.transaction().execute(async (trx) => {
      await setRedeemHalted(trx, false, actor.id, now);
      for (const months of [1, 6, 12] as const) {
        const { order, original, canonical } = await paid(trx, months);
        const oldCode = await trx.selectFrom("redeem_codes").selectAll().where("id", "=", original.code_id!).executeTakeFirstOrThrow();
        const before = await listOrders(trx);
        check(before.find((item) => item.id === order.id)?.canReplace === true, "the admin projection offers replacement only for an eligible sent code");
        check((await replacement(trx, order.id, original.serial!)).status === "replaced", "a sent unused virtual code can be replaced");
        const current = await row(trx, order.id);
        const replacementCode = await trx.selectFrom("redeem_codes").selectAll().where("id", "=", current.code_id!).executeTakeFirstOrThrow();
        const revoked = await trx.selectFrom("redeem_codes").selectAll().where("id", "=", original.code_id!).executeTakeFirstOrThrow();
        check(current.code_id !== original.code_id && current.serial !== original.serial && revoked.state === "revoked" && replacementCode.state === "issued", "the old code is revoked and exactly its new code becomes current");
        check(replacementCode.redeem_by?.getTime() === oldCode.redeem_by?.getTime() && current.months === months && current.email === original.email && current.paid_amount_sen === original.paid_amount_sen && current.paid_at?.getTime() === original.paid_at?.getTime(), "replacement preserves deadline, plan, recipient and payment facts");
        check(current.delivery_status === "PENDING" && current.delivered_at === null && current.delivery_attempts === 0 && current.last_attempt_at === null, "replacement resets delivery without claiming that it was sent");
        check(current.code_cipher, "replacement waits encrypted");
        const newCanonical = decryptOrderCode(codeKey.key, current.reference, current.code_cipher);
        const audit = await trx.selectFrom("admin_activity").selectAll().where("subject_id", "=", order.id).where("action", "=", "subscription.order.replace").execute();
        const dump = JSON.stringify([current, revoked, replacementCode, audit]);
        check(newCanonical !== canonical && !dump.includes(canonical) && !dump.includes(newCanonical) && !dump.includes(formatCode(newCanonical)), "neither old nor new plaintext code is stored in order, code or audit rows");
        check(audit.length === 1 && audit[0].actor_id === actor.id && audit[0].summary.includes(original.serial!) && audit[0].summary.includes(current.serial!) && audit[0].summary.includes("Fixture lost message"), "mandatory audit identifies the actor, reason and linked serials");
        check((await replacement(trx, order.id, original.serial!)).status === "changed" && (await row(trx, order.id)).code_id === current.code_id, "a stale retry does not replace the replacement");
        check((await replacement(trx, order.id, current.serial!)).status === "not_ready", "an unsent replacement must be retried rather than replaced again");
        check(!(await listOrders(trx)).find((item) => item.id === order.id)?.canReplace, "the pending replacement action is hidden in the admin projection");
        const failing: Mailer = { ...mailer, async sendMessage() { throw new Error("Fixture mail unavailable."); } };
        check(await deliverOrder(trx, { ...delivery, mailer: failing }, order.id) === "failed" && (await row(trx, order.id)).code_cipher === current.code_cipher, "a delivery failure preserves the same encrypted replacement");
        let received = false;
        const capture: Mailer = { ...mailer, async sendMessage(message) { received = message.to === original.email && message.text.includes(formatCode(newCanonical)) && message.text.includes(current.serial!); } };
        check(await deliverOrder(trx, { ...delivery, mailer: capture, now: at(31) }, order.id) === "sent" && received, "retry sends the same replacement to the original recipient");
        const sent = await row(trx, order.id);
        check(sent.code_cipher === null && sent.delivery_status === "SENT" && sent.code_id === current.code_id, "ciphertext is erased only after this replacement is sent");
        const publicStatus = JSON.stringify(await orderPublicStatus(trx, order.reference));
        check(!publicStatus.includes(current.serial!) && !publicStatus.includes(newCanonical) && !publicStatus.includes("code_cipher"), "the buyer status never exposes a replacement code or ciphertext");
        const email = `fixture-${randomUUID()}@e2e.invalid`;
        const reader = await trx.insertInto("reader_accounts").values({ email, email_normalized: email }).returning("id").executeTakeFirstOrThrow();
        accountIds.push(reader.id);
        const deps = { codeKey, now: at(32), limits: { failsPerAccountPer15Min: 1000, failsPerIpPerHour: 1000, failsAllPerHour: 1000 } };
        check((await redeemCode(trx, deps, { accountId: reader.id, code: canonical, serial: original.serial!, ipMac: actor.id })).status === "invalid", "the old code cannot be redeemed after replacement");
        check((await redeemCode(trx, deps, { accountId: reader.id, code: newCanonical, serial: current.serial!, ipMac: actor.id })).status === "ok", "the new code can be redeemed");
        check((await replacement(trx, order.id, current.serial!, at(33))).status === "unavailable", "a redeemed replacement cannot be replaced again");
      }

      const unpaid = await createOrder(trx, { months: 1, email: `fixture-${randomUUID()}@e2e.invalid`, amountSen: 1500 });
      orderIds.push(unpaid.id);
      check((await replacement(trx, randomUUID(), "fixture")).status === "unknown", "unknown orders do not create codes");
      check((await replacement(trx, unpaid.id, "fixture")).status === "changed", "unpaid orders do not create replacement codes");
      const waiting = await paid(trx, 1, false);
      check((await replacement(trx, waiting.order.id, waiting.original.serial!)).status === "not_ready", "the original unsent code must be sent instead of replaced");
      const expired = await paid(trx);
      await trx.updateTable("redeem_codes").set({ redeem_by: now }).where("id", "=", expired.original.code_id!).execute();
      check((await replacement(trx, expired.order.id, expired.original.serial!)).status === "expired", "replacement cannot extend a code at its exact expiry");
      const cancelled = await paid(trx);
      await trx.updateTable("redeem_codes").set({ state: "revoked", revoked_at: now, revoke_reason: "fixture" }).where("id", "=", cancelled.original.code_id!).execute();
      check((await replacement(trx, cancelled.order.id, cancelled.original.serial!)).status === "unavailable", "a revoked code is not revived by replacement");

      const auditFailure = await paid(trx);
      for (const invalid of [
        { reason: "", actor }, { reason: "x".repeat(161), actor },
        { reason: "fixture", actor: { id: "", name: "QA fixture" } },
      ]) {
        let refused = false;
        try { await replaceOrderCode(trx, { codeKey, now }, { orderId: auditFailure.order.id, expectedSerial: auditFailure.original.serial!, ...invalid }); }
        catch (error) { refused = error instanceof Error && error.message === "A reason and an identified owner are required."; }
        check(refused && (await row(trx, auditFailure.order.id)).code_id === auditFailure.original.code_id, "missing/oversized reasons and unidentified actors cannot change a code");
      }
      await sql`SAVEPOINT audit_failure`.execute(trx);
      let caught = false;
      const failAudit = new Proxy(trx, { get(target, property) {
        if (property === "insertInto") return (table: string) => { if (table === "admin_activity") throw new CheckFailure("Injected audit failure"); return target.insertInto(table as keyof Database); };
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      } });
      try { await replacement(failAudit, auditFailure.order.id, auditFailure.original.serial!); } catch (error) { caught = error instanceof CheckFailure; }
      await sql`ROLLBACK TO SAVEPOINT audit_failure`.execute(trx);
      await sql`RELEASE SAVEPOINT audit_failure`.execute(trx);
      check(caught && (await row(trx, auditFailure.order.id)).code_id === auditFailure.original.code_id &&
        (await trx.selectFrom("redeem_codes").select("state").where("id", "=", auditFailure.original.code_id!).executeTakeFirstOrThrow()).state === "issued", "an audit failure propagates and rollback preserves the original code and order");

      // Deterministic interleaving, on one connection; this does not claim to test concurrent transactions.
      for (const failLate of [false, true]) {
        const delayed = await paid(trx, 6, false);
        let newerId: string | null = null;
        const delayedMailer: Mailer = { ...mailer, async sendMessage() {
          check(await deliverOrder(trx, { ...delivery, now: at(31) }, delayed.order.id) === "sent", "a later delivery claim finishes first");
          check((await replacement(trx, delayed.order.id, delayed.original.serial!, at(32))).status === "replaced", "the completed code is replaced while the old sender is delayed");
          newerId = (await row(trx, delayed.order.id)).code_id;
          if (failLate) throw new Error("Late fixture delivery error.");
        } };
        const result = await deliverOrder(trx, { ...delivery, mailer: delayedMailer }, delayed.order.id);
        const current = await row(trx, delayed.order.id);
        check(result === (failLate ? "failed" : "skipped") && current.code_id === newerId && current.delivery_status === "PENDING" &&
          !!current.code_cipher && current.last_delivery_error === null, "a stale sender cannot erase the new ciphertext or overwrite its error/status");
      }
      throw new Rollback();
    });
  } catch (error) { if (!(error instanceof Rollback)) throw error; }
  check((await db.selectFrom("purchase_orders").select("id").where("id", "in", orderIds).execute()).length === 0 &&
    (await db.selectFrom("redeem_codes").select("id").where("key_id", "=", codeKey.keyId).execute()).length === 0 &&
    (await db.selectFrom("reader_accounts").select("id").where("id", "in", accountIds).execute()).length === 0 &&
    (await db.selectFrom("admin_activity").select("id").where("actor_id", "=", actor.id).execute()).length === 0,
  "all order, code, account and audit fixtures rolled back");
}

async function main() {
  const env = loadMigrationEnvironment(path.join(__dirname, ".."));
  delete env.ALLOW_NON_DEV_DATABASE;
  const connection = migrationConnection(env);
  console.log(`Database host: ${connection.host}`);
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool({ ...connection.poolOptions, max: 1 }) }) });
  try { await checks(db); console.log(`${passed} passed, 0 failed; all fixtures rolled back; no real mail or payment.`); }
  finally { await db.destroy(); }
}
void main().catch((error: unknown) => {
  console.error(error instanceof CheckFailure ? error.message : migrationFailureMessage(error).replace("Migration failed", "Order replacement check failed"));
  process.exitCode = 1;
});
