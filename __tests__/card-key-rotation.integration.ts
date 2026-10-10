/** Transaction-only test on the development database; every inserted row rolls back. */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { addTrial } from "../src/lib/reader-auth/entitlements";
import { confirmBatchPrinted, createBatch, issueCodes, redeemCode } from "../src/lib/reader-auth/redeem";
import { countEvents } from "../src/lib/reader-auth/service";

if (process.env.ALLOW_NON_DEV_DATABASE === "yes") throw new Error("Ujian putaran kunci tidak boleh dijalankan pada produksi.");
class Rollback extends Error {}
const current = { keyId: "rotation-new", key: Buffer.alloc(32, 18) };
const previous = { keyId: "rotation-old", key: Buffer.alloc(32, 19) };
const now = new Date();
const limits = { failsPerAccountPer15Min: 100, failsPerIpPerHour: 100, failsAllPerHour: 1000 };
const suffix = randomBytes(3).toString("hex").toUpperCase();
let checked = false;

void (async () => {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      const email = `rotation-${suffix.toLowerCase()}@e2e.invalid`;
      const account = await sql<{ id: string }>`INSERT INTO reader_accounts (email, email_normalized) VALUES (${email}, ${email}) RETURNING id`.execute(trx);
      const accountId = account.rows[0].id;
      await addTrial(trx, accountId, now, new Date(now.getTime() + 14 * 86400000));
      const batch = await createBatch(trx, { codeKey: previous, now }, { batchNumber: `ROT-${suffix}`, months: 1, quantity: 1 });
      await confirmBatchPrinted(trx, batch.batchId, now);
      await issueCodes(trx, { batchId: batch.batchId }, now);
      const deps = { codeKey: current, previousCodeKeys: [previous], now, limits };
      const wrong = await redeemCode(trx, deps, { accountId, ipMac: "rotation-test", code: batch.codes[0].code, batch: "WRONG" });
      const failures = await countEvents(trx, "redeem_fail", "account", accountId, new Date(now.getTime() - 15 * 60 * 1000));
      const good = await redeemCode(trx, deps, { accountId, ipMac: "rotation-test", code: batch.codes[0].code, batch: batch.batchNumber });
      assert.equal(wrong.status, "invalid");
      assert.equal(failures, 1, "multiple key candidates still count one failed guess");
      assert.equal(good.status, "ok", "an old-key printed card remains redeemable after rotation");
      checked = true;
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  } finally {
    await closeDb();
  }
  assert(checked);
  console.log("card key rotation integration tests passed (transaction rolled back)");
})();
