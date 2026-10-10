/**
 * Checks what the admin needs to manage cards and members (src/lib/reader-auth/redeem.ts: revokeUnredeemedCodes, replaceCode;
 * src/lib/reader-auth/admin.ts: batchInfo, listCodes, listMembers) against a real database, inside one transaction that is rolled back.
 * Local work only reaches the development branch (src/lib/db/env.ts). Run: npx tsx scripts/codes-admin-check.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { addGrant, addTrial } from "../src/lib/reader-auth/entitlements";
import { batchInfo, listCodes, listMembers } from "../src/lib/reader-auth/admin";
import { confirmBatchPrinted, createBatch, issueCodes, redeemCode, replaceCode, revokeUnredeemedCodes, createSharedCode } from "../src/lib/reader-auth/redeem";
import type { Db } from "../src/lib/reader-auth/service";
import type { MacKey } from "../src/lib/reader-auth/primitives";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
class Rollback extends Error {}
const codeKey: MacKey = { keyId: "test", key: Buffer.alloc(32, 7) };
const T0 = new Date("2026-11-01T02:00:00Z");
const day = (n: number) => new Date(T0.getTime() + n * 86400000);
const HIGH = { failsPerAccountPer15Min: 1000, failsPerIpPerHour: 1000, failsAllPerHour: 100000 };

async function account(db: Db, email: string, name: string | null = null): Promise<string> {
  const row = await sql<{ id: string }>`INSERT INTO reader_accounts (email, email_normalized, display_name, created_at) VALUES (${email}, ${email}, ${name}, ${T0}) RETURNING id`.execute(db);
  return row.rows[0].id;
}
async function throws(run: () => Promise<unknown>): Promise<string | null> {
  try { await run(); return null; } catch (e) { return e instanceof Error ? e.message : String(e); }
}

async function main() {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      // ---------------------------------------------------------- a batch and its cards
      console.log("\nA batch and its cards");
      const batch = await createBatch(trx, { codeKey, now: day(0) }, { batchNumber: "ca-001", months: 6, quantity: 6, createdBy: "ujian" });
      const info0 = await batchInfo(trx, batch.batchId);
      assert(info0?.counts.total === 6 && info0.counts.generated === 6 && info0.status === "PENDING_PRINT" && info0.confirmedAt === null, "a new batch: six cards, none switched on, print not confirmed");
      assert((await listCodes(trx, batch.batchId)).total === 6, "all six are listed");
      assert(await throws(() => replaceCode(trx, { codeKey, now: day(0) }, { serial: batch.codes[0].serial, reason: "ujian" })) !== null, "a card of a batch whose print is not confirmed cannot be replaced");
      await confirmBatchPrinted(trx, batch.batchId, day(1));
      assert((await batchInfo(trx, batch.batchId))?.confirmedAt?.getTime() === day(1).getTime(), "the print date is kept");
      assert((await issueCodes(trx, { batchId: batch.batchId }, day(2))) === 6, "six cards are switched on");
      const issued = await listCodes(trx, batch.batchId, { filter: "issued" });
      assert(issued.total === 6 && issued.rows.every((r) => r.issuedAt?.getTime() === day(2).getTime() && r.redeemedAt === null), "each card shows when it was switched on and is not redeemed");

      // ---------------------------------------------------------- one is redeemed
      console.log("\nOne card is redeemed");
      const A = await account(trx, "ahli-a@e2e.invalid", "Aina");
      await addTrial(trx, A, day(3), day(17));
      const first = batch.codes[0];
      const ok = await redeemCode(trx, { codeKey, now: day(5), limits: HIGH }, { accountId: A, ipMac: "ip", code: first.code, batch: "CA-001" });
      assert(ok.status === "ok", "the card is redeemed", ok);
      const redeemed = await listCodes(trx, batch.batchId, { filter: "redeemed" });
      assert(redeemed.total === 1 && redeemed.rows[0].serial === first.serial && redeemed.rows[0].redeemedBy === "ahli-a@e2e.invalid" && redeemed.rows[0].redeemedAt?.getTime() === day(5).getTime(), "it is listed as redeemed, with who and when");
      assert(redeemed.rows[0].accessEndsAt !== null && redeemed.rows[0].accessEndsAt.getTime() > day(17).getTime(), "and with the end of the access it gave");
      const unredeemed = await listCodes(trx, batch.batchId, { filter: "unredeemed" });
      assert(unredeemed.total === 5 && !unredeemed.rows.some((r) => r.serial === first.serial), "five are not redeemed");
      const found = await listCodes(trx, batch.batchId, { q: first.serial.slice(-4) });
      assert(found.rows.some((r) => r.serial === first.serial), "a card is found by part of its serial number");

      // ---------------------------------------------------------- cancelling cards that are not redeemed
      console.log("\nCancelling cards not yet redeemed");
      const [, s2, s3, s4, s5, s6] = batch.codes.map((c) => c.serial);
      const res = await revokeUnredeemedCodes(trx, [first.serial, s2, s3, "JLN-26-999999"], "kad hilang dalam pos", day(6));
      assert(res.revoked.length === 2 && res.revoked.includes(s2) && res.revoked.includes(s3), "two unredeemed cards are cancelled");
      assert(res.skipped.some((x) => x.serial === first.serial && x.why === "redeemed") && res.skipped.some((x) => x.why === "not_found"), "a redeemed card and an unknown serial are skipped, and said so");
      const again = await revokeUnredeemedCodes(trx, [s2], "sekali lagi", day(7));
      assert(again.revoked.length === 0 && again.skipped[0].why === "already_revoked", "cancelling twice does nothing");
      assert(await throws(() => revokeUnredeemedCodes(trx, [s4], "  ")) !== null, "a reason is required");
      const revokedList = await listCodes(trx, batch.batchId, { filter: "revoked" });
      assert(revokedList.total === 2 && revokedList.rows.every((r) => r.revokeReason === "kad hilang dalam pos" && r.revokedAt?.getTime() === day(6).getTime()), "the cancelled cards show the reason and the date");
      const stolen = await redeemCode(trx, { codeKey, now: day(8), limits: HIGH }, { accountId: A, ipMac: "ip", code: batch.codes[1].code, batch: "CA-001" });
      assert(stolen.status === "invalid", "a cancelled card can no longer be redeemed");

      // ---------------------------------------------------------- replacing a card
      console.log("\nReplacing a card");
      const replaced = await replaceCode(trx, { codeKey, now: day(9) }, { serial: s4, reason: "label rosak" });
      assert(replaced.oldSerial === s4 && replaced.serial !== s4 && replaced.batchNumber === "CA-001" && replaced.months === 6 && /^JLN-26-\d{6}$/.test(replaced.serial), "a replacement is made in the same batch");
      const afterReplace = await listCodes(trx, batch.batchId, { q: s4 });
      assert(afterReplace.rows[0].state === "revoked" && (afterReplace.rows[0].revokeReason ?? "").includes(replaced.serial) && (afterReplace.rows[0].revokeReason ?? "").includes("label rosak"), "the old card is cancelled and says which card replaced it");
      const newRow = await listCodes(trx, batch.batchId, { q: replaced.serial });
      assert(newRow.rows[0].state === "issued" && newRow.rows[0].issuedAt?.getTime() === day(9).getTime(), "the new card starts switched on, like the one it replaces");
      assert((await batchInfo(trx, batch.batchId))?.counts.total === 7 && (await batchInfo(trx, batch.batchId))?.quantity === 7, "the batch counts one more card");
      const dump = await sql<{ t: string }>`SELECT string_agg(r::text, ' ') AS t FROM redeem_codes r WHERE batch_id = ${batch.batchId}`.execute(trx);
      assert(!dump.rows[0].t.includes(replaced.canonical) && !dump.rows[0].t.includes(replaced.code), "the new plain code is not stored");
      const useNew = await redeemCode(trx, { codeKey, now: day(10), limits: HIGH }, { accountId: A, ipMac: "ip", code: replaced.code, batch: "CA-001" });
      assert(useNew.status === "ok", "the new code redeems with the same batch number", useNew);
      const useOld = await redeemCode(trx, { codeKey, now: day(11), limits: HIGH }, { accountId: await account(trx, "ahli-x@e2e.invalid"), ipMac: "ip", code: batch.codes[3].code, batch: "CA-001" });
      assert(useOld.status === "invalid", "the old code no longer works");
      assert((await throws(() => replaceCode(trx, { codeKey, now: day(12) }, { serial: first.serial, reason: "x" })))?.includes("redeemed") === true, "a redeemed card cannot be replaced");
      assert((await throws(() => replaceCode(trx, { codeKey, now: day(12) }, { serial: s4, reason: "x" })))?.includes("cancelled") === true, "a cancelled card cannot be replaced");
      assert(await throws(() => replaceCode(trx, { codeKey, now: day(12) }, { serial: s5, reason: "" })) !== null, "a reason is required");
      const sixth = await replaceCode(trx, { codeKey, now: day(12) }, { serial: s6, reason: "ujian" });
      assert(sixth.serial !== replaced.serial, "every replacement gets its own serial number");

      // ---------------------------------------------------------- the members
      console.log("\nThe members");
      const none = await account(trx, "ahli-none@e2e.invalid", "Tiada Akses");
      const inTrial = await account(trx, "ahli-trial@e2e.invalid");
      await addTrial(trx, inTrial, day(20), day(34));
      const ended = await account(trx, "ahli-ended@e2e.invalid");
      await addTrial(trx, ended, day(0), day(14));
      const shared = await createSharedCode(trx, { grant: { unit: "days", amount: 14 }, maxRedemptions: 5, channel: "ujian", now: day(0) });
      const withShared = await account(trx, "ahli-shared@e2e.invalid");
      const gotShared = await redeemCode(trx, { codeKey, now: day(21), limits: HIGH }, { accountId: withShared, ipMac: "ip", code: shared.code });
      assert(gotShared.status === "ok", "a shared code is redeemed", gotShared);
      const deleted = await account(trx, "ahli-deleted@e2e.invalid");
      await sql`UPDATE reader_accounts SET status = 'deleted' WHERE id = ${deleted}`.execute(trx);
      void none;
      const now = day(22);
      const all = await listMembers(trx, { pageSize: 500 }, now);
      const byEmail = new Map(all.rows.map((r) => [r.email, r]));
      assert(!byEmail.has("ahli-deleted@e2e.invalid"), "a deleted account is not listed");
      assert(byEmail.get("ahli-none@e2e.invalid")?.status === "tiada" && byEmail.get("ahli-none@e2e.invalid")?.endsAt === null, "a reader with no access: none, no end date");
      assert(byEmail.get("ahli-trial@e2e.invalid")?.status === "percubaan" && byEmail.get("ahli-trial@e2e.invalid")?.endsAt?.getTime() === day(34).getTime() && byEmail.get("ahli-trial@e2e.invalid")?.source === "Percubaan percuma", "in the trial: status, end date and source");
      assert(byEmail.get("ahli-ended@e2e.invalid")?.status === "tamat" && byEmail.get("ahli-ended@e2e.invalid")?.endsAt?.getTime() === day(14).getTime(), "trial over: ended, with the date it ended");
      const sharedRow = byEmail.get("ahli-shared@e2e.invalid");
      assert(sharedRow?.status === "aktif" && (sharedRow?.source ?? "").includes("Kod kongsi") && sharedRow.endsAt !== null, "a shared code: active, with its source and end date");
      const cardRow = byEmail.get("ahli-a@e2e.invalid");
      assert(cardRow?.status === "aktif" && (cardRow.source ?? "").includes("Kad JLN-26-") && cardRow.displayName === "Aina", "a card: active, the serial number as source, and the name");
      assert(all.counts.aktif >= 2 && all.counts.percubaan >= 1 && all.counts.tamat >= 1 && all.counts.tiada >= 1 && all.counts.semua === all.total, "the counts add up");
      const onlyActive = await listMembers(trx, { status: "aktif", pageSize: 500 }, now);
      assert(onlyActive.rows.every((r) => r.status === "aktif") && onlyActive.total === onlyActive.rows.length, "filtering by status shows only that status");
      const search = await listMembers(trx, { q: "AHLI-SHARED" }, now);
      assert(search.rows.length === 1 && search.rows[0].email === "ahli-shared@e2e.invalid", "searching finds by part of the e-mail, whatever the case");
      const byName = await listMembers(trx, { q: "tiada akses" }, now);
      assert(byName.rows.some((r) => r.email === "ahli-none@e2e.invalid"), "and by name");
      const wild = await listMembers(trx, { q: "%%%" }, now);
      assert(wild.rows.length === 0, "wildcard characters are not wildcards");
      const paged = await listMembers(trx, { pageSize: 2, page: 2 }, now);
      assert(paged.rows.length <= 2 && paged.page === 2, "pages are cut as asked");

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) { failed++; console.error("  ✗ unexpected error:", error); }
  } finally {
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed (nothing was saved)`);
  if (failed) process.exit(1);
}

void main();
