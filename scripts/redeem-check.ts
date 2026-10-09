/**
 * Checks redeeming (migration 030, src/lib/reader-auth/redeem.ts) against a real database. Most of it runs inside one transaction that
 * is rolled back. The last part commits real rows from many connections at once (a transaction cannot test that) and cleans up with
 * TRUNCATE, which is allowed on the development branch only: src/lib/db/env.ts keeps this script off production.
 * Run: npm run db:redeem-check
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { addTrial, getAccess, listLedger } from "../src/lib/reader-auth/entitlements";
import { confirmBatchPrinted, createBatch, createSharedCode, isRedeemHalted, issueCodes, redeemCode, revokeCode, setRedeemHalted, setSharedCodeStatus, voidBatch } from "../src/lib/reader-auth/redeem";
import type { Db } from "../src/lib/reader-auth/service";
import { formatCode } from "../src/lib/subscription/redeem-code";
import { addMonthsMYT } from "../src/lib/subscription/periods";
import type { MacKey } from "../src/lib/reader-auth/primitives";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
class Rollback extends Error {}
const codeKey: MacKey = { keyId: "test", key: Buffer.alloc(32, 5) };
const otherKey: MacKey = { keyId: "test", key: Buffer.alloc(32, 6) };
const T0 = new Date("2026-11-01T02:00:00Z");
const day = (n: number) => new Date(T0.getTime() + n * 86400000);
const same = (a: Date, b: Date) => a.getTime() === b.getTime();
const IP = "ip-mac-test";

async function newAccount(db: Db, email: string): Promise<string> {
  const row = await sql<{ id: string }>`INSERT INTO reader_accounts (email, email_normalized) VALUES (${email}, ${email}) RETURNING id`.execute(db);
  await addTrial(db, row.rows[0].id, T0, day(14));
  return row.rows[0].id;
}
// The helper lifts the limits so a run of wrong tries does not stop the test; the limits themselves are tested further down.
const HIGH = { failsPerAccountPer15Min: 1000, failsPerIpPerHour: 1000, failsAllPerHour: 100000 };
const redeem = (db: Db, accountId: string, code: string, batch: string | undefined, when = 3, limits: Parameters<typeof redeemCode>[1]["limits"] = HIGH, key = codeKey) =>
  redeemCode(db, { codeKey: key, now: day(when), limits }, { accountId, ipMac: IP, code, batch });

async function main() {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      const A = await newAccount(trx, "tebus-a@e2e.invalid");
      const B = await newAccount(trx, "tebus-b@e2e.invalid");

      // ---------------------------------------------------------- making a batch
      const batch = await createBatch(trx, { codeKey, now: day(0) }, { batchNumber: "t-001", months: 6, quantity: 4, orderRef: "Sekolah X", createdBy: "ujian" });
      assert(batch.batchNumber === "T-001" && batch.codes.length === 4 && new Set(batch.codes.map((c) => c.serial)).size === 4 && batch.codes.every((c) => /^JLN-26-\d{6}$/.test(c.serial)), "a batch of four cards gets four different serial numbers");
      const stored = await sql<{ n: string }>`SELECT count(*) AS n FROM redeem_codes WHERE ${batch.codes[0].canonical} = ANY (ARRAY[code_mac, serial])`.execute(trx);
      const dump = await sql<{ t: string }>`SELECT string_agg(r::text, ' ') AS t FROM redeem_codes r WHERE batch_id = ${batch.batchId}`.execute(trx);
      assert(Number(stored.rows[0].n) === 0 && batch.codes.every((c) => !dump.rows[0].t.includes(c.canonical) && !dump.rows[0].t.includes(c.code)), "the plain codes are not stored anywhere: only keyed hashes");
      const row = await sql<{ status: string }>`SELECT status FROM code_batches WHERE id = ${batch.batchId}`.execute(trx);
      assert(row.rows[0].status === "PENDING_PRINT", "a new batch is waiting for its print to be confirmed");
      assert((await issueCodes(trx, { batchId: batch.batchId }, day(0))) === 0, "codes of a batch not yet confirmed cannot be issued");
      assert((await redeem(trx, A, batch.codes[0].code, "T-001")).status === "invalid", "an unissued code cannot be redeemed");

      // ---------------------------------------------------------- issuing
      assert(await confirmBatchPrinted(trx, batch.batchId, day(1)) && !(await confirmBatchPrinted(trx, batch.batchId, day(1))), "the print is confirmed once");
      assert((await issueCodes(trx, { serials: [batch.codes[0].serial, "JLN-26-999999"] }, day(1))) === 1, "issuing by serial number switches on only the cards named");
      assert((await redeem(trx, A, batch.codes[1].code, "T-001")).status === "invalid", "a card not yet issued still cannot be redeemed");

      // ---------------------------------------------------------- redeeming
      const wrongBatch = await redeem(trx, A, batch.codes[0].code, "T-002");
      const wrongCheck = await redeem(trx, A, batch.codes[0].code.slice(0, -1) + (batch.codes[0].code.endsWith("0") ? "1" : "0"), "T-001");
      const noBatch = await redeem(trx, A, batch.codes[0].code, undefined);
      const garbage = await redeem(trx, A, "bukan kod", "T-001");
      const nothing = await redeem(trx, A, "", "");
      assert([wrongBatch, wrongCheck, noBatch, garbage, nothing].every((r) => r.status === "invalid"), "a wrong batch, a wrong check character, no batch and nonsense are all refused");
      assert(JSON.stringify([wrongBatch, garbage, nothing]) === JSON.stringify([{ status: "invalid" }, { status: "invalid" }, { status: "invalid" }]), "and every refusal is the same answer: nothing tells which part was wrong");
      assert((await redeem(trx, A, batch.codes[0].code, "T-001", 3, undefined, otherKey)).status === "invalid", "a different key cannot open the codes");

      const first = await redeem(trx, A, batch.codes[0].code.toLowerCase().replace(/-/g, " "), " t-001 ", 3);
      assert(first.status === "ok" && first.kind === "card" && same(first.startsAt, day(14)) && same(first.endsAt, addMonthsMYT(day(14), 6)), "the right code and batch redeem: 6 months starting when the trial ends", first);
      const ledger = await listLedger(trx, A);
      assert(ledger.length === 2 && ledger[1].kind === "CARD" && ledger[1].reason === `Kad ${batch.codes[0].serial}`, "one CARD period was added to the ledger");
      const access = await getAccess(trx, A, day(20));
      assert(access.state === "subscribed" && first.status === "ok" && same(access.endsAt!, first.endsAt), "the reader is subscribed until the card period ends");
      const again = await redeem(trx, A, batch.codes[0].code, "T-001", 4);
      assert(again.status === "ok" && again.repeat === true && (await listLedger(trx, A)).length === 2, "the same reader sending it again gets the same success and no second period");
      const stolen = await redeem(trx, B, batch.codes[0].code, "T-001", 4);
      assert(stolen.status === "invalid", "another reader cannot redeem a code that was already used");
      await refusesInsert(trx, "the database itself refuses a second redemption of the same code", () =>
        sql`INSERT INTO redemptions (code_id, account_id, entitlement_id) SELECT code_id, ${B}, entitlement_id FROM redemptions LIMIT 1`.execute(trx));

      // ---------------------------------------------------------- revoking and voiding
      await issueCodes(trx, { batchId: batch.batchId }, day(1));
      assert(await revokeCode(trx, batch.codes[1].serial, "Kad hilang", day(2)) && !(await revokeCode(trx, batch.codes[1].serial, "lagi", day(2))), "a lost card is cancelled once");
      assert((await redeem(trx, B, batch.codes[1].code, "T-001", 5)).status === "invalid", "a cancelled code cannot be redeemed");
      assert((await redeem(trx, B, batch.codes[2].code, "T-001", 5)).status === "ok", "the other cards of the batch still work");
      const v = await createBatch(trx, { codeKey, now: day(0) }, { batchNumber: "V-001", months: 1, quantity: 2 });
      await confirmBatchPrinted(trx, v.batchId); await issueCodes(trx, { batchId: v.batchId });
      assert(await voidBatch(trx, v.batchId, "Cetakan rosak") && !(await voidBatch(trx, v.batchId, "lagi")), "a bad print is voided once");
      assert((await redeem(trx, A, v.codes[0].code, "V-001", 6)).status === "invalid", "no card of a voided batch can be redeemed");
      let noReason = false; try { await voidBatch(trx, batch.batchId, " "); } catch { noReason = true; }
      assert(noReason, "voiding needs a reason");
      let badQty = false; try { await createBatch(trx, { codeKey }, { batchNumber: "Z-1", months: 6, quantity: 0 }); } catch { badQty = true; }
      let badMonths = false; try { await createBatch(trx, { codeKey }, { batchNumber: "Z-2", months: 3 as 1, quantity: 1 }); } catch { badMonths = true; }
      let badNumber = false; try { await createBatch(trx, { codeKey }, { batchNumber: "no good!", months: 6, quantity: 1 }); } catch { badNumber = true; }
      assert(badQty && badMonths && badNumber, "a bad quantity, length or batch number is refused");

      // ---------------------------------------------------------- stop switch and limits
      await setRedeemHalted(trx, true, "izzat");
      assert((await isRedeemHalted(trx)) && (await redeem(trx, A, batch.codes[3].code, "T-001", 7)).status === "halted", "with the stop switch on, nothing can be redeemed");
      await setRedeemHalted(trx, false, "izzat");
      assert(!(await isRedeemHalted(trx)), "and it can be switched off again");
      const C = await newAccount(trx, "tebus-c@e2e.invalid");
      let throttledAt = -1;
      for (let i = 0; i < 8; i++) { const r = await redeemCode(trx, { codeKey, now: day(8) }, { accountId: C, ipMac: `ip-c-${i}`, code: "AAAA-AAAA-AAAA-AAAA-A", batch: "T-001" }); if (r.status === "throttled" && throttledAt < 0) throttledAt = i; }
      assert(throttledAt === 5, "five wrong tries in 15 minutes stop a reader (even from other networks)", throttledAt);
      assert((await redeemCode(trx, { codeKey, now: day(8) }, { accountId: C, ipMac: "ip-c-x", code: batch.codes[3].code, batch: "T-001" })).status === "throttled", "while stopped, even a right code waits");
      assert((await redeemCode(trx, { codeKey, now: new Date(day(8).getTime() + 16 * 60 * 1000) }, { accountId: C, ipMac: "ip-c-y", code: batch.codes[3].code, batch: "T-001" })).status === "ok", "after 15 minutes the reader can try again");
      let ipThrottle = -1;
      const D = await newAccount(trx, "tebus-d@e2e.invalid");
      for (let i = 0; i < 25; i++) { const acc = await newAccount(trx, `tebus-ip${i}@e2e.invalid`); const r = await redeemCode(trx, { codeKey, now: day(9) }, { accountId: acc, ipMac: "same-network", code: "BBBB-BBBB-BBBB-BBBB-B", batch: "T-001" }); if (r.status === "throttled" && ipThrottle < 0) ipThrottle = i; }
      assert(ipThrottle === 20 && D.length > 0, "twenty wrong tries from one network in an hour stop that network", ipThrottle);

      // ---------------------------------------------------------- shared codes
      const E = await newAccount(trx, "tebus-e@e2e.invalid");
      const F = await newAccount(trx, "tebus-f@e2e.invalid");
      const G = await newAccount(trx, "tebus-g@e2e.invalid");
      const shared = await createSharedCode(trx, { grant: { unit: "days", amount: 14 }, maxRedemptions: 2, channel: "Telegram", createdBy: "izzat", now: day(0) });
      const s1 = await redeem(trx, E, shared.code.toLowerCase(), undefined, 10);
      assert(s1.status === "ok" && s1.kind === "shared" && same(s1.startsAt, day(14)) && same(s1.endsAt, day(28)), "a shared code gives 14 days after the access the reader already has", s1);
      assert((await redeem(trx, E, shared.code, undefined, 11)).status === "already", "the same reader is told they already used it");
      assert((await redeem(trx, F, shared.code, "tak-perlu", 11)).status === "ok", "a second reader redeems it (the batch field is ignored)");
      assert((await redeem(trx, G, shared.code, undefined, 12)).status === "invalid", "the third is refused: the limit is two");
      const countRow = await sql<{ redeemed_count: number }>`SELECT redeemed_count FROM shared_codes WHERE id = ${shared.id}`.execute(trx);
      assert(countRow.rows[0].redeemed_count === 2, "the count is exactly two");
      const typo = shared.code.slice(0, -1) + (shared.code.endsWith("0") ? "1" : "0");
      assert((await redeem(trx, G, typo, undefined, 12)).status === "invalid", "a shared code with a wrong check character is refused");
      const s2 = await createSharedCode(trx, { grant: { unit: "months", amount: 1 }, maxRedemptions: 5, expiresAt: day(20), now: day(0) });
      assert((await redeem(trx, G, s2.code, undefined, 19)).status === "ok", "a shared code works before its last day");
      assert((await redeem(trx, F, s2.code, undefined, 20)).status === "invalid", "and not on it (the end is exclusive)");
      const s3 = await createSharedCode(trx, { grant: { unit: "months", amount: 6 }, maxRedemptions: 5, now: day(0) });
      await setSharedCodeStatus(trx, s3.id, "paused");
      assert((await redeem(trx, E, s3.code, undefined, 13)).status === "invalid", "a paused code cannot be redeemed");
      await setSharedCodeStatus(trx, s3.id, "active");
      assert((await redeem(trx, E, s3.code, undefined, 13)).status === "ok", "and works again when resumed");
      await setSharedCodeStatus(trx, s3.id, "revoked");
      assert((await redeem(trx, F, s3.code, undefined, 14)).status === "invalid", "a revoked code cannot be redeemed");
      await refusesInsert(trx, "a shared code cannot be over-used even by writing directly", () => sql`UPDATE shared_codes SET redeemed_count = max_redemptions + 1 WHERE id = ${shared.id}`.execute(trx));
      await refusesInsert(trx, "a shared code cannot be given a length that is not offered", () => sql`INSERT INTO shared_codes (code, grant_unit, grant_amount, max_redemptions) VALUES ('JLN-ZZZZZZZ', 'months', 3, 5)`.execute(trx));

      // ---------------------------------------------------------- the record outlives the reader
      await sql`DELETE FROM reader_accounts WHERE id = ${A}`.execute(trx);
      const kept = await sql<{ n: string; linked: string }>`SELECT count(*) AS n, count(account_id) AS linked FROM redemptions WHERE code_id IN (SELECT id FROM redeem_codes WHERE batch_id = ${batch.batchId}) AND redeemed_at = ${day(3)}`.execute(trx);
      assert(Number(kept.rows[0].n) === 1 && Number(kept.rows[0].linked) === 0, "deleting the reader keeps the redemption, without the link to them");
      assert(parseInt(batch.codes[3].serial.slice(-6), 10) > parseInt(batch.codes[0].serial.slice(-6), 10) && parseInt(v.codes[0].serial.slice(-6), 10) > parseInt(batch.codes[3].serial.slice(-6), 10), "serial numbers keep counting up across batches");
      assert(formatCode(batch.codes[0].canonical) === batch.codes[0].code, "the printed form is the display form of the canonical code");

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) { failed++; console.error("  ✗ unexpected error:", error); }
  }

  // ------------------------------------------------------------ many at once, committed for real
  try {
    console.log("\nMany at once");
    const key = codeKey;
    const accounts: string[] = [];
    for (let i = 0; i < 12; i++) accounts.push(await newAccount(db, `par-${i}@e2e.invalid`));
    const b = await createBatch(db, { codeKey: key }, { batchNumber: "PAR-001", months: 1, quantity: 2 });
    await confirmBatchPrinted(db, b.batchId); await issueCodes(db, { batchId: b.batchId });
    const now = new Date();
    const race = await Promise.all(accounts.slice(0, 10).map((acc, i) => redeemCode(db, { codeKey: key, now }, { accountId: acc, ipMac: `race-${i}`, code: b.codes[0].code, batch: "PAR-001" })));
    const redemptions = await sql<{ n: string }>`SELECT count(*) AS n FROM redemptions r JOIN redeem_codes c ON c.id = r.code_id WHERE c.batch_id = ${b.batchId}`.execute(db);
    assert(race.filter((r) => r.status === "ok").length === 1 && Number(redemptions.rows[0].n) === 1, "ten readers racing for one card: exactly one gets it", race.map((r) => r.status));
    const same6 = await Promise.all(Array.from({ length: 6 }, () => redeemCode(db, { codeKey: key, now }, { accountId: accounts[10], ipMac: "same6", code: b.codes[1].code, batch: "PAR-001" })));
    const ledger = (await listLedger(db, accounts[10])).filter((l) => l.kind === "CARD");
    assert(same6.every((r) => r.status === "ok") && ledger.length === 1, "one reader pressing the button six times at once: all answered ok, one period only", { s: same6.map((r) => r.status), n: ledger.length });
    const sc = await createSharedCode(db, { grant: { unit: "days", amount: 7 }, maxRedemptions: 5 });
    const sharedRace = await Promise.all(accounts.map((acc, i) => redeemCode(db, { codeKey: key, now }, { accountId: acc, ipMac: `sr-${i}`, code: sc.code })));
    const counted = await sql<{ redeemed_count: number }>`SELECT redeemed_count FROM shared_codes WHERE id = ${sc.id}`.execute(db);
    const given = await sql<{ n: string }>`SELECT count(*) AS n FROM shared_redemptions WHERE shared_code_id = ${sc.id}`.execute(db);
    assert(sharedRace.filter((r) => r.status === "ok").length === 5 && counted.rows[0].redeemed_count === 5 && Number(given.rows[0].n) === 5, "twelve readers racing for the last places of a code with limit five: exactly five get in", { ok: sharedRace.filter((r) => r.status === "ok").length, count: counted.rows[0].redeemed_count });
  } catch (error) {
    failed++; console.error("  ✗ unexpected error in the concurrent part:", error);
  } finally {
    await sql`TRUNCATE redemptions, shared_redemptions, redeem_codes, code_batches, shared_codes, entitlements`.execute(db);
    await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@e2e.invalid'`.execute(db);
    await sql`DELETE FROM reader_auth_events`.execute(db);
    await sql`DELETE FROM reader_switches WHERE key = 'redeem_halted'`.execute(db);
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

async function refusesInsert(trx: any, label: string, run: () => Promise<unknown>) {
  await sql`SAVEPOINT s`.execute(trx);
  try { await run(); await sql`RELEASE SAVEPOINT s`.execute(trx); assert(false, `${label} (was accepted)`); }
  catch (error) { await sql`ROLLBACK TO SAVEPOINT s`.execute(trx); const c = (error as { code?: string }).code; assert(c === "23505" || c === "23514" || c === "23000", label, c); }
}

void main();
