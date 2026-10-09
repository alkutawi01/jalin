/**
 * The restore drill (study gate G4: "no double redemption, even after a restore"). It plays the whole story on the development database:
 * cards are made and redeemed, a signed file is exported, the database is "restored" to an earlier moment (rows made after that moment
 * are removed, the way a point-in-time restore would remove them), and the file is applied. Then it checks that no card used before the
 * restore can be used again, that cards printed after the restore point are back, and that counters never went down.
 *
 * It commits real rows and removes them at the end (TRUNCATE; the ledger trigger is switched off for the drill and back on). Local work
 * only reaches the development branch (src/lib/db/env.ts). Run: npm run db:restore-drill
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { buildCodesExport, findRedemptionsByEmailMac, parseCodesExport, reconcileWithExport } from "../src/lib/reader-auth/codes-export";
import { addTrial, getAccess } from "../src/lib/reader-auth/entitlements";
import { emailLookupMac, loadCodeKey, loadMacKey } from "../src/lib/reader-auth/primitives";
import { confirmBatchPrinted, createBatch, createSharedCode, isRedeemHalted, issueCodes, redeemCode, revokeCode, setRedeemHalted } from "../src/lib/reader-auth/redeem";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

async function main() {
  const db = getDb();
  const codeKey = loadCodeKey();
  const readerKey = loadMacKey();
  const now = new Date();
  const HIGH = { failsPerAccountPer15Min: 1000, failsPerIpPerHour: 1000, failsAllPerHour: 100000 };
  const redeem = (accountId: string, code: string, batch?: string) => redeemCode(db, { codeKey, now, limits: HIGH }, { accountId, ipMac: "drill", code, batch });
  const accountOf = async (n: string) => {
    const row = await sql<{ id: string }>`INSERT INTO reader_accounts (email, email_normalized) VALUES (${`${n}@e2e.invalid`}, ${`${n}@e2e.invalid`}) RETURNING id`.execute(db);
    await addTrial(db, row.rows[0].id, now, new Date(now.getTime() + 14 * 86400000));
    return row.rows[0].id;
  };

  try {
    await sql`ALTER TABLE entitlements DISABLE TRIGGER entitlements_guard_trg`.execute(db);
    await sql`TRUNCATE redemptions, shared_redemptions, redeem_codes, code_batches, shared_codes, entitlements`.execute(db);
    await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@e2e.invalid'`.execute(db);
    await sql`DELETE FROM reader_switches WHERE key = 'redeem_halted'`.execute(db);
    await sql`ALTER SEQUENCE redeem_serial_seq RESTART WITH 1`.execute(db);

    const A = await accountOf("drill-a"); const B = await accountOf("drill-b"); const C = await accountOf("drill-c"); const D = await accountOf("drill-d");

    // ------------------------------------------------------------ the world at the restore point
    console.log("\nThe world at the restore point");
    const b1 = await createBatch(db, { codeKey, now }, { batchNumber: "DR-001", months: 6, quantity: 4 });
    await confirmBatchPrinted(db, b1.batchId); await issueCodes(db, { batchId: b1.batchId });
    const s1 = await createSharedCode(db, { grant: { unit: "days", amount: 14 }, maxRedemptions: 3, channel: "Telegram" });
    assert((await redeem(A, b1.codes[0].code, "DR-001")).status === "ok" && (await redeem(A, s1.code)).status === "ok", "reader A redeemed card 1 and the shared code");
    const ids = async (table: string) => (await sql<{ id: string }>`SELECT id FROM ${sql.table(table)}`.execute(db)).rows.map((r) => r.id);
    const atPoint: Record<string, string[]> = {};
    for (const t of ["shared_redemptions", "redemptions", "entitlements", "redeem_codes", "code_batches", "shared_codes"]) atPoint[t] = await ids(t);
    const seqAtPoint = Number((await sql<{ v: string }>`SELECT last_value AS v FROM redeem_serial_seq`.execute(db)).rows[0].v);
    const countAtPoint = (await sql<{ c: number }>`SELECT redeemed_count AS c FROM shared_codes WHERE id = ${s1.id}`.execute(db)).rows[0].c;

    // ------------------------------------------------------------ what happens after, and will be lost
    console.log("\nWhat happens after the restore point");
    assert((await redeem(B, b1.codes[1].code, "DR-001")).status === "ok" && (await redeem(C, b1.codes[2].code, "DR-001")).status === "ok", "readers B and C redeem cards 2 and 3");
    assert(await revokeCode(db, b1.codes[3].serial, "Kad hilang"), "card 4 is cancelled as lost");
    const b2 = await createBatch(db, { codeKey, now }, { batchNumber: "DR-002", months: 12, quantity: 3 });
    await confirmBatchPrinted(db, b2.batchId); await issueCodes(db, { batchId: b2.batchId });
    assert((await redeem(B, b2.codes[0].code, "DR-002")).status === "ok", "a whole new batch is printed, issued, and B redeems one of its cards");
    const s2 = await createSharedCode(db, { grant: { unit: "months", amount: 1 }, maxRedemptions: 2, channel: "Acara" });
    assert((await redeem(C, s2.code)).status === "ok" && (await redeem(B, s1.code)).status === "ok" && (await redeem(C, s1.code)).status === "ok", "a second shared code is made and used; the first gets two more uses");
    const readerKeyMacB = emailLookupMac(readerKey, "drill-b@e2e.invalid");

    // ------------------------------------------------------------ the signed file
    console.log("\nThe file kept outside the database");
    const file = await buildCodesExport(db, { codeKey, readerKey });
    const parsed = parseCodesExport(file, codeKey);
    assert(parsed.batches.length === 2 && parsed.codes.length === 7 && parsed.redemptions.length === 4 && parsed.shared.length === 2 && parsed.sharedRedemptions.length === 4, "the file holds both batches, seven codes, four card redemptions, two shared codes, four uses",{ b: parsed.batches.length, c: parsed.codes.length, r: parsed.redemptions.length, s: parsed.shared.length, sr: parsed.sharedRedemptions.length });
    const allPlain = [...b1.codes, ...b2.codes].flatMap((c) => [c.canonical, c.code]);
    assert(!allPlain.some((p) => file.includes(p)) && !/@/.test(file) && !file.includes(A), "the file has no plain code, no e-mail address and no account number");
    assert(file.includes(readerKeyMacB), "but a reader can be found in it by the keyed hash of their e-mail");
    const lines = file.split("\n");
    const tampered = [...lines]; tampered[3] = tampered[3].replace('"state":"issued"', '"state":"generated"');
    assert(throws(() => parseCodesExport(tampered.join("\n"), codeKey)) && throws(() => parseCodesExport(lines.slice(0, -2).join("\n") + "\n", codeKey)) && throws(() => parseCodesExport(file, loadCodeKeyOther())) && throws(() => parseCodesExport("", codeKey)) && throws(() => parseCodesExport("{}\n{}\n", codeKey)), "a changed, cut, wrongly signed, empty or nonsense file is refused");

    // ------------------------------------------------------------ the restore
    console.log("\nThe database is restored to the restore point");
    await sql`DELETE FROM shared_redemptions WHERE NOT (id = ANY(${atPoint.shared_redemptions}::uuid[]))`.execute(db);
    await sql`DELETE FROM redemptions WHERE NOT (id = ANY(${atPoint.redemptions}::uuid[]))`.execute(db);
    await sql`DELETE FROM entitlements WHERE NOT (id = ANY(${atPoint.entitlements}::uuid[]))`.execute(db);
    await sql`DELETE FROM redeem_codes WHERE NOT (id = ANY(${atPoint.redeem_codes}::uuid[]))`.execute(db);
    await sql`DELETE FROM code_batches WHERE NOT (id = ANY(${atPoint.code_batches}::uuid[]))`.execute(db);
    await sql`DELETE FROM shared_codes WHERE NOT (id = ANY(${atPoint.shared_codes}::uuid[]))`.execute(db);
    await sql`UPDATE redeem_codes SET state = 'issued', revoked_at = NULL, revoke_reason = NULL WHERE serial = ${b1.codes[3].serial}`.execute(db);
    await sql`UPDATE shared_codes SET redeemed_count = ${countAtPoint} WHERE id = ${s1.id}`.execute(db);
    await sql`SELECT setval('redeem_serial_seq', ${seqAtPoint}, true)`.execute(db);
    const after = (await sql<{ n: string }>`SELECT (SELECT count(*) FROM redemptions) AS n`.execute(db)).rows[0].n;
    assert(Number(after) === 1, "only card 1 redemption survived the restore", after);

    // The danger, shown for real (inside a transaction that is thrown away).
    class Undo extends Error {}
    let danger = "";
    try {
      await db.transaction().execute(async (trx) => {
        const r = await redeemCode(trx, { codeKey, now, limits: HIGH }, { accountId: D, ipMac: "drill", code: b1.codes[1].code, batch: "DR-001" });
        danger = r.status;
        throw new Undo();
      });
    } catch (e) { if (!(e instanceof Undo)) throw e; }
    assert(danger === "ok", "WITHOUT the file: card 2, already used by B, could be redeemed again by someone else (this is the danger)", danger);

    // ------------------------------------------------------------ reconcile
    console.log("\nApplying the file");
    const dry = await reconcileWithExport(db, parsed, { apply: false, now });
    assert(!dry.applied && dry.batchesAdded === 1 && dry.codesAdded === 3 && dry.sharedAdded === 1 && dry.sharedCountsRaised === 1, "a dry run reports what it would do and changes nothing", dry);
    assert(!(await isRedeemHalted(db)) && Number((await sql<{ n: string }>`SELECT count(*) AS n FROM code_batches`.execute(db)).rows[0].n) === 1, "the dry run left the database and the stop switch alone");
    const done = await reconcileWithExport(db, parsed, { apply: true, now, by: "latihan" });
    assert(done.applied && done.batchesAdded === 1 && done.codesAdded === 3 && done.codesCancelledForLostRedemption === 3 && done.codesCancelledAsInExport === 1 && done.sharedAdded === 1 && done.sharedCountsRaised === 1, "applied: batch 2 and its 3 codes put back; cards 2, 3 and batch 2's used card cancelled; the lost cancellation of card 4 restored; shared code 2 put back; shared count raised", done);
    assert(done.lostRedemptions.length === 3 && done.lostRedemptions.every((l) => l.emailMac), "the report lists the three redemptions that were lost, with their e-mail hashes");
    assert(await isRedeemHalted(db), "the stop switch is ON and stays on until a person switches it off");
    assert((await redeem(D, b2.codes[1].code, "DR-002")).status === "halted", "while it is on nothing can be redeemed");
    await setRedeemHalted(db, false, "latihan");

    // ------------------------------------------------------------ the result
    console.log("\nAfter the reconcile");
    assert((await redeem(D, b1.codes[1].code, "DR-001")).status === "invalid" && (await redeem(D, b1.codes[2].code, "DR-001")).status === "invalid", "cards 2 and 3 can no longer be used by anyone else");
    assert((await redeem(D, b1.codes[3].code, "DR-001")).status === "invalid", "card 4 is cancelled again, as it was in the file");
    assert((await redeem(D, b2.codes[0].code, "DR-002")).status === "invalid", "the card of the lost batch that B had used cannot be used again");
    assert((await redeem(D, b2.codes[1].code, "DR-002")).status === "ok", "another card of the lost batch, never used, works for its owner");
    assert((await redeem(A, b1.codes[0].code, "DR-001")).status === "ok" && (await redeem(A, b1.codes[0].code, "DR-001").then((r) => r.status === "ok" && r.repeat === true)), "reader A, whose redemption survived, is still recognised as the owner of card 1");
    const sc = await sql<{ redeemed_count: number; status: string }>`SELECT redeemed_count, status FROM shared_codes WHERE code = ${s1.code}`.execute(db);
    assert(sc.rows[0].redeemed_count === 3, "shared code 1 is back to three uses, not one: the limit is not reset by the restore", sc.rows[0]);
    const s2row = await sql<{ redeemed_count: number }>`SELECT redeemed_count FROM shared_codes WHERE code = ${s2.code}`.execute(db);
    assert(s2row.rows[0]?.redeemed_count === 1, "shared code 2 is back with its use counted");
    assert((await redeem(D, s1.code)).status === "invalid", "so the full shared code stays full");
    const next = await createBatch(db, { codeKey, now }, { batchNumber: "DR-003", months: 1, quantity: 2 });
    const used = new Set([...b1.codes, ...b2.codes].map((c) => c.serial));
    assert(next.codes.every((c) => !used.has(c.serial)), "a batch made after the restore gets serial numbers nobody has used");
    const again = await reconcileWithExport(db, parsed, { apply: true, now });
    assert(again.batchesAdded === 0 && again.codesAdded === 0 && again.sharedAdded === 0 && again.sharedCountsRaised === 0 && again.codesCancelledAsInExport === 0, "applying the same file again changes nothing");
    await setRedeemHalted(db, false, "latihan");

    // ------------------------------------------------------------ giving readers their access back
    console.log("\nA reader who lost their access");
    const found = findRedemptionsByEmailMac(parsed, readerKeyMacB);
    assert(found.length === 3 && found.filter((f) => f.kind === "card").map((f) => f.months).sort().join() === "12,6" && found.some((f) => f.kind === "shared"), "B is found by their e-mail: two cards (12 and 6 months) and a shared code, with the dates");
    assert(findRedemptionsByEmailMac(parsed, emailLookupMac(readerKey, "tiada@e2e.invalid")).length === 0, "an address that never redeemed anything is not found");
    assert((await getAccess(db, B, now)).state === "trial", "B has only the trial in the restored database: the access is given back by hand, with the admin, using the list above");
  } catch (error) {
    failed++; console.error("  ✗ unexpected error:", error);
  } finally {
    await sql`TRUNCATE redemptions, shared_redemptions, redeem_codes, code_batches, shared_codes, entitlements`.execute(db).catch(() => undefined);
    await sql`ALTER TABLE entitlements ENABLE TRIGGER entitlements_guard_trg`.execute(db).catch(() => undefined);
    await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@e2e.invalid'`.execute(db).catch(() => undefined);
    await sql`DELETE FROM reader_switches WHERE key = 'redeem_halted'`.execute(db).catch(() => undefined);
    await sql`ALTER SEQUENCE redeem_serial_seq RESTART WITH 1`.execute(db).catch(() => undefined);
    const trig = await sql<{ enabled: string }>`SELECT tgenabled AS enabled FROM pg_trigger WHERE tgname = 'entitlements_guard_trg'`.execute(db);
    console.log(`\n(cleaned up; ledger trigger enabled: ${trig.rows[0]?.enabled === "O"})`);
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

function loadCodeKeyOther() {
  return { keyId: "other", key: Buffer.alloc(32, 3) };
}

void main();
