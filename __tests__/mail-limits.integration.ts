/** Transaction-only mail-budget test on the development database. No e-mail is sent. */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { strict as assert } from "node:assert";
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { emailLookupMac, type Mailer } from "../src/lib/reader-auth/primitives";
import { recordEvent, requestLoginCode, verifyLoginCode } from "../src/lib/reader-auth/service";

if (process.env.ALLOW_NON_DEV_DATABASE === "yes") throw new Error("Ujian kuota e-mel tidak boleh dijalankan pada produksi.");
class Rollback extends Error {}
const key = { keyId: "mail-test", key: Buffer.alloc(32, 21) };
const sent = new Map<string, string>();
const mailer: Mailer = { name: "test", async sendLoginCode({ to, code }) { sent.set(to, code); } };
const now = new Date("2035-01-01T12:00:00.000Z");
const limits = { requestsPerDayAll: 6, requestsPerDayNew: 4, requestsPerEmailPerHour: 10, requestsPerIpPerHour: 100 };
let checked = false;

void (async () => {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      for (const email of ["existing-one@e2e.invalid", "existing-two@e2e.invalid", "existing-three@e2e.invalid"]) {
        await sql`INSERT INTO reader_accounts (email, email_normalized) VALUES (${email}, ${email})`.execute(trx);
      }
      const ask = (email: string) => requestLoginCode(trx, { key, mailer, now, limits }, { email, ipMac: "mail-test-ip" });
      for (let i = 0; i < 4; i++) assert.equal((await ask(`new-${i}@e2e.invalid`)).ok, true);
      assert.deepEqual(await ask("new-fifth@e2e.invalid"), { ok: false, reason: "throttled" }, "new addresses cannot consume the reserved budget");
      assert.equal((await ask("existing-one@e2e.invalid")).ok, true);
      assert.equal((await ask("existing-two@e2e.invalid")).ok, true);
      assert.deepEqual(await ask("existing-three@e2e.invalid"), { ok: false, reason: "throttled" }, "the global cap still applies to existing readers");

      const later = new Date("2036-01-01T12:00:00.000Z");
      const email = "daily-guess@e2e.invalid";
      assert.equal((await requestLoginCode(trx, { key, mailer, now: later, limits: { requestsPerDayAll: 100 } }, { email, ipMac: "daily-ip" })).ok, true);
      const mac = emailLookupMac(key, email);
      for (let i = 0; i < 30; i++) await recordEvent(trx, "verify_fail", "email", mac, new Date(later.getTime() - 2 * 60 * 60 * 1000 - i * 1000));
      const result = await verifyLoginCode(trx, { key, now: later }, { email, code: sent.get(email)!, ipMac: "daily-ip" });
      assert.equal(result.status, "throttled", "30 failed checks in a day stop a correct code even below the hourly limit");
      checked = true;
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  } finally {
    await closeDb();
  }
  assert(checked);
  console.log("mail limit integration tests passed (transaction rolled back)");
})();
