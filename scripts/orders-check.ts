/**
 * Checks the orders for a bought code (migrations 036 and 037, src/lib/reader-auth/orders.ts) against a real database. Most of it runs inside
 * one transaction that is rolled back. The part about many callbacks at once commits real rows from many connections (a transaction cannot
 * test that) and removes them again afterwards; src/lib/db/env.ts keeps this script off production.
 * Run: npx tsx scripts/orders-check.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { addTrial } from "../src/lib/reader-auth/entitlements";
import { attachBill, cancelOrder, countRecentOrdersByEmail, createOrder, deliverOrder, fulfilPaidOrder, listOrders, orderPublicStatus, retryPendingDeliveries } from "../src/lib/reader-auth/orders";
import { redeemCode } from "../src/lib/reader-auth/redeem";
import type { Mailer, MacKey } from "../src/lib/reader-auth/primitives";
import type { Db } from "../src/lib/reader-auth/service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
class Rollback extends Error {}
const codeKey: MacKey = { keyId: "test", key: Buffer.alloc(32, 9) };
const T0 = new Date("2026-11-01T02:00:00Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);
const SITE = "https://jalin.adjung.com";

type Sent = { to: string; subject: string; text: string; html: string };
function fakeMailer(): { mailer: Mailer; sent: Sent[]; failNext: { on: boolean } } {
  const sent: Sent[] = [];
  const failNext = { on: false };
  const mailer: Mailer = {
    name: "test",
    async sendLoginCode() {},
    async sendMessage(message) {
      if (failNext.on) throw new Error("Mail provider refused the message (503).");
      sent.push(message);
    },
  };
  return { mailer, sent, failNext };
}

async function newAccount(db: Db, email: string): Promise<string> {
  const row = await sql<{ id: string }>`INSERT INTO reader_accounts (email, email_normalized) VALUES (${email}, ${email}) RETURNING id`.execute(db);
  await addTrial(db, row.rows[0].id, T0, new Date(T0.getTime() + 14 * 86400000));
  return row.rows[0].id;
}
const HIGH = { failsPerAccountPer15Min: 1000, failsPerIpPerHour: 1000, failsAllPerHour: 100000 };
const codeFrom = (text: string) => /Kod: ([0-9A-Z-]{21})/.exec(text)![1];
const serialFrom = (text: string) => /Nombor siri: (JLN-[0-9A-Z-]+)/.exec(text)![1];

async function main() {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      console.log("\nAn order, paid once");
      const o = await createOrder(trx, { months: 6, email: "pembeli@e2e.invalid", amountSen: 7900 });
      assert(/^JP-[0-9A-Z]{10}$/.test(o.reference), "an order gets a number like JP-XXXXXXXXXX");
      await attachBill(trx, o.id, "bill_test_1");
      const early = await fulfilPaidOrder(trx, { codeKey, now: at(10) }, { billId: "unknown_bill", paidAmountSen: 7900 });
      assert(early.status === "unknown", "a callback for a bill we do not know makes nothing");
      const row0 = await trx.selectFrom("purchase_orders").selectAll().where("id", "=", o.id).executeTakeFirstOrThrow();
      assert(row0.status === "PENDING" && row0.code_id === null && row0.code_cipher === null, "an order that is not paid has no code");

      const paid = await fulfilPaidOrder(trx, { codeKey, now: at(60) }, { billId: "bill_test_1", paidAmountSen: 7900 });
      assert(paid.status === "issued", "a paid order makes a code", paid);
      const again = await fulfilPaidOrder(trx, { codeKey, now: at(61) }, { billId: "bill_test_1", paidAmountSen: 7900 });
      assert(again.status === "already", "the gateway calling back again makes nothing more", again);
      const codes = await sql<{ n: string }>`SELECT count(*) AS n FROM redeem_codes WHERE id = (SELECT code_id FROM purchase_orders WHERE id = ${o.id})`.execute(trx);
      const row1 = await trx.selectFrom("purchase_orders").selectAll().where("id", "=", o.id).executeTakeFirstOrThrow();
      assert(Number(codes.rows[0].n) === 1 && row1.status === "PAID" && row1.delivery_status === "PENDING" && /^JLN-06B\d{4}-M\d{2}$/.test(row1.serial ?? ""), "one paid order, one code, with a virtual serial; the e-mail is waiting", row1.serial);
      assert(!!row1.code_cipher && !row1.code_cipher.includes("JLN") && row1.code_cipher.startsWith("v1."), "the code waits encrypted, not as text");

      console.log("\nSending the e-mail");
      const m = fakeMailer();
      const deps = { codeKey, mailer: m.mailer, siteUrl: SITE, now: at(120) };
      assert((await deliverOrder(trx, deps, o.id)) === "sent" && m.sent.length === 1, "the e-mail goes", m.sent.length);
      const body = m.sent[0];
      const code = codeFrom(body.text);
      const serial = serialFrom(body.text);
      assert(body.to === "pembeli@e2e.invalid" && serial === row1.serial && body.text.includes("6 bulan") && body.text.includes(o.reference) && body.html.includes(serial), "it carries the serial, the code, the length and the order number, to the buyer");
      assert(/Tebus sebelum: \d{1,2} [A-Z]{3} \d{4}/.test(body.text), "and the last day to redeem");
      const row2 = await trx.selectFrom("purchase_orders").selectAll().where("id", "=", o.id).executeTakeFirstOrThrow();
      assert(row2.delivery_status === "SENT" && row2.code_cipher === null && row2.delivered_at !== null && row2.delivery_attempts === 1, "once sent, the encrypted code is erased");
      const dump = await sql<{ t: string }>`SELECT string_agg(p::text, ' ') AS t FROM purchase_orders p WHERE id = ${o.id}`.execute(trx);
      assert(!dump.rows[0].t.replace(/-/g, "").includes(code.replace(/-/g, "")), "the plain code is nowhere in the order row");
      assert((await deliverOrder(trx, { ...deps, now: at(400) }, o.id)) === "skipped" && m.sent.length === 1, "sending again does nothing: one e-mail only");

      console.log("\nThe e-mailed code works");
      const reader = await newAccount(trx, "pembeli-akaun@e2e.invalid");
      const ok = await redeemCode(trx, { codeKey, now: at(500), limits: HIGH }, { accountId: reader, ipMac: "ip", code, serial });
      assert(ok.status === "ok" && ok.kind === "card", "redeemed with the serial and code from the e-mail", ok);
      const twice = await redeemCode(trx, { codeKey, now: at(501), limits: HIGH }, { accountId: await newAccount(trx, "lain@e2e.invalid"), ipMac: "ip", code, serial });
      assert(twice.status === "invalid", "and by nobody else afterwards");

      console.log("\nA failed e-mail is tried again, with the same code");
      const o2 = await createOrder(trx, { months: 12, email: "gagal@e2e.invalid", amountSen: 14900 });
      await attachBill(trx, o2.id, "bill_test_2");
      await fulfilPaidOrder(trx, { codeKey, now: at(1000) }, { billId: "bill_test_2", paidAmountSen: 14900 });
      const n1 = fakeMailer();
      n1.failNext.on = true;
      const d1 = { codeKey, mailer: n1.mailer, siteUrl: SITE, now: at(1010) };
      assert((await deliverOrder(trx, d1, o2.id)) === "failed" && n1.sent.length === 0, "a refused e-mail reports failed");
      const f1 = await trx.selectFrom("purchase_orders").selectAll().where("id", "=", o2.id).executeTakeFirstOrThrow();
      assert(f1.delivery_status === "PENDING" && !!f1.code_cipher && f1.delivery_attempts === 1 && /refused/.test(f1.last_delivery_error ?? ""), "the order stays waiting, with the encrypted code and the reason");
      assert(!/[0-9A-Z]{4}(-[0-9A-Z]{4}){3}/.test(f1.last_delivery_error ?? ""), "the reason holds no code");
      n1.failNext.on = false;
      assert((await deliverOrder(trx, { ...d1, now: at(1015) }, o2.id)) === "skipped", "a second try within half a minute is turned away (so two tries at once cannot both send)");
      assert((await deliverOrder(trx, { ...d1, now: at(1045) }, o2.id)) === "sent" && n1.sent.length === 1, "after the cool-down it is sent");
      const codesAfter = await sql<{ n: string }>`SELECT count(*) AS n FROM redeem_codes WHERE serial = ${f1.serial}`.execute(trx);
      assert(Number(codesAfter.rows[0].n) === 1 && serialFrom(n1.sent[0].text) === f1.serial, "still the one code that was made when it was paid");

      console.log("\nOrders that must not make a code");
      const o3 = await createOrder(trx, { months: 1, email: "kurang@e2e.invalid", amountSen: 1500 });
      await attachBill(trx, o3.id, "bill_test_3");
      const short = await fulfilPaidOrder(trx, { codeKey, now: at(2000) }, { billId: "bill_test_3", paidAmountSen: 1000 });
      const noAmount = await fulfilPaidOrder(trx, { codeKey, now: at(2001) }, { billId: "bill_test_3", paidAmountSen: null });
      const r3 = await trx.selectFrom("purchase_orders").selectAll().where("id", "=", o3.id).executeTakeFirstOrThrow();
      assert(short.status === "amount_mismatch" && noAmount.status === "amount_mismatch" && r3.status === "PENDING" && r3.code_id === null && /kurang/.test(r3.note ?? ""), "less than the price (or no amount) makes no code, and leaves a note for a person");
      const o4 = await createOrder(trx, { months: 1, email: "batal@e2e.invalid", amountSen: 1500 });
      await attachBill(trx, o4.id, "bill_test_4");
      await cancelOrder(trx, o4.id, "gerbang tidak dapat membuat bil");
      const lateCall = await fulfilPaidOrder(trx, { codeKey, now: at(2100) }, { billId: "bill_test_4", paidAmountSen: 1500 });
      assert(lateCall.status === "cancelled_paid", "a payment for an order we had closed makes no code and is flagged");
      await cancelOrder(trx, o.id, "cuba batal pesanan yang sudah dibayar");
      const stillPaid = await trx.selectFrom("purchase_orders").select("status").where("id", "=", o.id).executeTakeFirstOrThrow();
      assert(stillPaid.status === "PAID", "a paid order cannot be cancelled by mistake");

      console.log("\nWhat the buyer and the admin see");
      const pub = await orderPublicStatus(trx, o.reference);
      assert(pub.found && pub.status === "PAID" && pub.delivery === "SENT" && pub.emailHint === "pe***@e2e.invalid" && !JSON.stringify(pub).includes("pembeli@"), "the thank-you page gets the status and only a hint of the address");
      assert(!(await orderPublicStatus(trx, "JP-AAAAAAAAAA")).found && !(await orderPublicStatus(trx, "'; DROP TABLE x;--")).found, "an unknown or malformed number finds nothing");
      const list = await listOrders(trx, 50);
      assert(list.some((r) => r.reference === o.reference && r.deliveryStatus === "SENT") && list.some((r) => r.reference === o3.reference && r.note), "the admin list shows orders with their delivery and notes");
      assert((await countRecentOrdersByEmail(trx, "pembeli@e2e.invalid", new Date(Date.now() - 3600000))) === 1, "orders by one address in the last hour can be counted (for the limit)");
      const o5 = await createOrder(trx, { months: 6, email: "retry@e2e.invalid", amountSen: 7900 });
      await attachBill(trx, o5.id, "bill_test_5");
      await fulfilPaidOrder(trx, { codeKey, now: at(3000) }, { billId: "bill_test_5", paidAmountSen: 7900 });
      const n5 = fakeMailer();
      const sweep = await retryPendingDeliveries(trx, { codeKey, mailer: n5.mailer, siteUrl: SITE, now: at(3100) }, 10);
      assert(sweep.sent >= 1 && n5.sent.some((s) => s.to === "retry@e2e.invalid"), "a sweep sends every e-mail still waiting");

      console.log("\nGuards");
      let badMonths = false; try { await createOrder(trx, { months: 3 as 1, email: "x@e2e.invalid", amountSen: 1000 }); } catch { badMonths = true; }
      let badAmount = false; try { await createOrder(trx, { months: 1, email: "x@e2e.invalid", amountSen: 50 }); } catch { badAmount = true; }
      assert(badMonths && badAmount, "a length other than 1, 6, 12 and an amount under RM1 are refused");
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) { failed++; console.error("  ✗ unexpected error:", error); }
  }

  // ------------------------------------------------------------ the same callback many times at once, committed for real
  console.log("\nThe same callback many times at once");
  let ref = "";
  try {
    const o = await createOrder(db, { months: 1, email: "serentak@e2e.invalid", amountSen: 1500 });
    ref = o.reference;
    await attachBill(db, o.id, "bill_race_1");
    const results = await Promise.all(Array.from({ length: 8 }, () => fulfilPaidOrder(db, { codeKey, now: at(5000) }, { billId: "bill_race_1", paidAmountSen: 1500 })));
    const made = results.filter((r) => r.status === "issued").length;
    const codes = await sql<{ n: string }>`SELECT count(*) AS n FROM redeem_codes WHERE id = (SELECT code_id FROM purchase_orders WHERE reference = ${ref})`.execute(db);
    assert(made === 1 && results.every((r) => r.status === "issued" || r.status === "already") && Number(codes.rows[0].n) === 1, "eight callbacks at once make exactly one code", results.map((r) => r.status));
    const m = fakeMailer();
    const sends = await Promise.all(Array.from({ length: 6 }, () => deliverOrder(db, { codeKey, mailer: m.mailer, siteUrl: SITE, now: at(5100) }, o.id)));
    assert(m.sent.length === 1 && sends.filter((s) => s === "sent").length === 1, "six tries to send at once send exactly one e-mail", sends);
  } catch (error) {
    failed++; console.error("  ✗ unexpected error:", error);
  } finally {
    if (ref) {
      const code = await sql<{ code_id: string | null; serial: string | null }>`SELECT code_id, serial FROM purchase_orders WHERE reference = ${ref}`.execute(db);
      await sql`DELETE FROM purchase_orders WHERE reference = ${ref}`.execute(db).catch(() => undefined);
      const s = code.rows[0]?.serial;
      if (s) {
        const batch = await sql<{ batch_id: string }>`DELETE FROM redeem_codes WHERE serial = ${s} RETURNING batch_id`.execute(db).catch(() => ({ rows: [] as { batch_id: string }[] }));
        for (const b of batch.rows) await sql`UPDATE code_batches SET quantity = quantity - 1 WHERE id = ${b.batch_id}`.execute(db).catch(() => undefined);
        await sql`DELETE FROM code_batches WHERE quantity <= 0 AND channel = 'virtual'`.execute(db).catch(() => undefined);
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await closeDb();
  if (failed) process.exit(1);
}

void main();
