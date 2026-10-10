/** Transaction-only owner login throttle test on the development database. */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { strict as assert } from "node:assert";
import { closeDb, getDb } from "../src/lib/db";
import { ownerLoginAttempt } from "../src/lib/admin/owner-login-limits";

if (process.env.ALLOW_NON_DEV_DATABASE === "yes") throw new Error("Ujian log masuk pemilik tidak boleh dijalankan pada produksi.");
class Rollback extends Error {}
const now = new Date("2037-01-01T12:00:00.000Z");
let checked = false;

void (async () => {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      for (let i = 0; i < 5; i++) assert.equal(await ownerLoginAttempt(trx, "203.0.113.1", "test-signing-key", false, now), "invalid");
      assert.equal(await ownerLoginAttempt(trx, "203.0.113.1", "test-signing-key", true, now), "locked", "five failed attempts lock the owner IP for 15 minutes");
      assert.equal(await ownerLoginAttempt(trx, "203.0.113.2", "test-signing-key", true, now), "ok", "another IP is not locked by the per-IP limit");
      for (let i = 0; i < 45; i++) assert.equal(await ownerLoginAttempt(trx, `198.51.100.${i}`, "test-signing-key", false, now), "invalid");
      assert.equal(await ownerLoginAttempt(trx, "192.0.2.1", "test-signing-key", true, now), "locked", "the global limit also blocks distributed guessing temporarily");
      assert.equal(await ownerLoginAttempt(trx, "203.0.113.1", "test-signing-key", true, new Date(now.getTime() + 16 * 60_000)), "ok", "the temporary lock expires");
      checked = true;
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  } finally {
    await closeDb();
  }
  assert(checked);
  console.log("owner login limit integration tests passed (transaction rolled back)");
})();
