/**
 * Runs reader sign-in (src/lib/reader-auth/service.ts) against a real database inside one transaction that is rolled back, with a
 * mailer that only remembers what it was asked to send and a clock the test moves by hand. Nothing is sent and nothing is kept.
 * Local work only reaches the development branch (src/lib/db/env.ts). Run: npm run db:reader-auth-check
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import {
  getSession,
  listDevices,
  requestLoginCode,
  signOut,
  signOutEverywhere,
  startTrial,
  verifyLoginCode,
  type Db,
} from "../src/lib/reader-auth/service";
import { emailLookupMac, ipMac, type MacKey, type Mailer } from "../src/lib/reader-auth/primitives";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
class Rollback extends Error {}

const key: MacKey = { keyId: "test", key: Buffer.alloc(32, 9) };
const sent: { to: string; code: string }[] = [];
let failMail = false;
const mailer: Mailer = {
  name: "test",
  async sendLoginCode({ to, code }) {
    if (failMail) throw new Error("down");
    sent.push({ to, code });
  },
};
const minutes = (n: number) => n * 60 * 1000;
const T0 = new Date("2026-11-01T02:00:00Z");
const at = (m: number) => new Date(T0.getTime() + minutes(m));
const IP = ipMac(key, "203.0.113.7");
const last = () => sent[sent.length - 1];

async function signIn(db: Db, email: string, when: number, extra: { replaceDeviceId?: string; label?: string } = {}) {
  const req = await requestLoginCode(db, { key, mailer, now: at(when), limits: { requestsPerEmailPerHour: 50 } }, { email, ipMac: IP });
  if (!req.ok) return { req, ver: null as never };
  const ver = await verifyLoginCode(db, { key, now: at(when + 0.1) }, { email, code: last().code, ipMac: IP, deviceLabel: extra.label, replaceDeviceId: extra.replaceDeviceId });
  return { req, ver };
}

async function main() {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      // Asking for a code.
      assert(JSON.stringify(await requestLoginCode(trx, { key, mailer, now: at(0) }, { email: "bukan-emel", ipMac: IP })) === JSON.stringify({ ok: false, reason: "invalid_email" }), "something that is not an address is refused");
      const first = await requestLoginCode(trx, { key, mailer, now: at(0) }, { email: "  Aina@Contoh.MY ", ipMac: IP });
      assert(first.ok && sent.length === 1 && sent[0].to === "aina@contoh.my" && /^\d{6}$/.test(sent[0].code), "a code of six digits is sent to the normalised address");
      const stored = await sql<{ n: string }>`SELECT count(*) AS n FROM reader_auth_challenges WHERE otp_mac = ${sent[0].code} OR email_lookup_mac LIKE '%aina%'`.execute(trx);
      assert(Number(stored.rows[0].n) === 0, "neither the code nor the address is stored in the clear");
      const again = await requestLoginCode(trx, { key, mailer, now: at(0.5) }, { email: "aina@contoh.my", ipMac: IP });
      assert(!again.ok && again.reason === "throttled" && sent.length === 1, "a second request within a minute is refused and sends nothing");
      const oldCode = sent[0].code;
      const second = await requestLoginCode(trx, { key, mailer, now: at(2) }, { email: "aina@contoh.my", ipMac: IP });
      assert(second.ok && sent.length === 2, "after a minute a new code is sent");
      const retired = await verifyLoginCode(trx, { key, now: at(2.1) }, { email: "aina@contoh.my", code: oldCode, ipMac: IP });
      assert(oldCode === sent[1].code ? true : retired.status === "invalid", "the earlier code stops working once a new one is sent");

      // Wrong codes.
      const wrong = sent[1].code === "000000" ? "000001" : "000000";
      const w1 = await verifyLoginCode(trx, { key, now: at(2.2) }, { email: "aina@contoh.my", code: wrong, ipMac: IP });
      assert(w1.status === "invalid", "a wrong code is refused");
      for (let i = 0; i < 4; i++) await verifyLoginCode(trx, { key, now: at(2.3) }, { email: "aina@contoh.my", code: wrong, ipMac: IP });
      const afterFive = await verifyLoginCode(trx, { key, now: at(2.4) }, { email: "aina@contoh.my", code: sent[1].code, ipMac: IP });
      assert(afterFive.status === "invalid", "after five wrong tries even the right code no longer works");

      // A good sign-in creates the account, with no access yet; the trial is a step the reader chooses.
      const a = await signIn(trx, "aina@contoh.my", 10, { label: "Telefon Aina" });
      assert(a.ver.status === "ok" && a.ver.isNewAccount, "the right code signs in and creates the account", a.ver);
      if (a.ver.status !== "ok") throw new Error("cannot continue");
      assert(a.ver.trialEndsAt === null, "a new account has no trial until its reader starts it");
      const noAccess = await trx.selectFrom("entitlements").select("id").where("account_id", "=", a.ver.accountId).execute();
      assert(noAccess.length === 0, "and nothing is in the access ledger yet");
      const t1 = await startTrial(trx, { key, now: at(10.5) }, a.ver.accountId);
      assert(t1.status === "ok" && t1.endsAt.getTime() === at(10.5).getTime() + 14 * 24 * 3600 * 1000, "starting the trial gives 14 days from that moment");
      const t2 = await startTrial(trx, { key, now: at(11) }, a.ver.accountId);
      assert(t2.status === "already" && t2.endsAt?.getTime() === (t1.status === "ok" ? t1.endsAt.getTime() : 0), "pressing it again changes nothing");
      const ledgerRows = await trx.selectFrom("entitlements").select(["kind"]).where("account_id", "=", a.ver.accountId).execute();
      assert(ledgerRows.length === 1 && ledgerRows[0].kind === "TRIAL", "exactly one trial period is in the ledger");
      assert((await startTrial(trx, { key, now: at(11) }, "00000000-0000-0000-0000-000000000000")).status === "no_account", "an account that does not exist cannot start a trial");
      const session = await getSession(trx, a.ver.token, at(11));
      assert(session?.account.email === "aina@contoh.my" && session.device.label === "Telefon Aina", "the cookie token finds the account and device");
      assert((await getSession(trx, a.ver.token + "x", at(11))) === null && (await getSession(trx, "", at(11))) === null, "a wrong or empty token finds nothing");
      const reuse = await verifyLoginCode(trx, { key, now: at(10.2) }, { email: "aina@contoh.my", code: last().code, ipMac: IP });
      assert(reuse.status === "invalid", "a code can be used only once");

      // Expiry.
      await requestLoginCode(trx, { key, mailer, now: at(20) }, { email: "aina@contoh.my", ipMac: IP });
      const late = await verifyLoginCode(trx, { key, now: at(25.5) }, { email: "aina@contoh.my", code: last().code, ipMac: IP });
      assert(late.status === "invalid", "a code is dead after five minutes");

      // Two devices, then a third.
      const second2 = await signIn(trx, "aina@contoh.my", 30, { label: "Komputer riba" });
      assert(second2.ver.status === "ok" && !second2.ver.isNewAccount && second2.ver.trialEndsAt !== null, "the same address signs in again as the same account on a second device");
      const third = await signIn(trx, "aina@contoh.my", 40, { label: "Tablet" });
      assert(third.ver.status === "choose_device" && third.ver.devices.length === 2, "a third device is asked to choose one of the two to replace");
      const devices = await listDevices(trx, a.ver.accountId);
      const phone = devices.find((d) => d.label === "Telefon Aina")!;
      const stranger = await verifyLoginCode(trx, { key, now: at(40.2) }, { email: "aina@contoh.my", code: last().code, ipMac: IP, replaceDeviceId: "00000000-0000-0000-0000-000000000000" });
      assert(stranger.status === "invalid", "naming a device that is not hers is refused");
      const chosen = await verifyLoginCode(trx, { key, now: at(40.3) }, { email: "aina@contoh.my", code: last().code, ipMac: IP, deviceLabel: "Tablet", replaceDeviceId: phone.id });
      assert(chosen.status === "ok", "choosing a device lets the third one in with the same code");
      assert((await getSession(trx, a.ver.token, at(41))) === null, "the replaced device is signed out at once");
      assert((await listDevices(trx, a.ver.accountId)).length === 2, "she still has exactly two devices");

      // Signing out.
      if (chosen.status !== "ok") throw new Error("cannot continue");
      await signOut(trx, chosen.token, at(42));
      assert((await getSession(trx, chosen.token, at(42))) === null && (await listDevices(trx, a.ver.accountId)).length === 1, "signing out ends that device only");
      await signOutEverywhere(trx, a.ver.accountId, at(43));
      assert((await listDevices(trx, a.ver.accountId)).length === 0, "signing out everywhere ends every device");

      // The trial is given once, even after deleting the account.
      await trx.updateTable("reader_accounts").set({ status: "deleted" }).where("id", "=", a.ver.accountId).execute();
      const back = await signIn(trx, "aina@contoh.my", 60);
      assert(back.ver.status === "ok" && back.ver.isNewAccount && back.ver.trialEndsAt === null, "registering again after deleting starts clean");
      if (back.ver.status !== "ok") throw new Error("cannot continue");
      assert((await startTrial(trx, { key, now: at(61) }, back.ver.accountId)).status === "used", "and gets no second trial: the address has used it");

      // One address: five codes an hour.
      let hourly = -1;
      for (let i = 0; i < 8; i++) {
        const r = await requestLoginCode(trx, { key, mailer, now: at(700 + i * 2) }, { email: "sejam@contoh.my", ipMac: ipMac(key, "203.0.113.77") });
        if (!r.ok && hourly < 0) hourly = i;
      }
      assert(hourly === 5, "one address can be sent at most five codes an hour", hourly);

      // No giving away which addresses exist.
      const known = await requestLoginCode(trx, { key, mailer, now: at(70), limits: { requestsPerEmailPerHour: 50 } }, { email: "aina@contoh.my", ipMac: IP });
      const unknown = await requestLoginCode(trx, { key, mailer, now: at(70) }, { email: "tiada.siapa@contoh.my", ipMac: IP });
      assert(known.ok && unknown.ok, "asking for a code answers the same for an address with an account and one without");

      // Limits.
      const hourMailer = (n: number) => `huruf${n}@contoh.my`;
      let refusedAt = -1;
      for (let i = 0; i < 25; i++) {
        const r = await requestLoginCode(trx, { key, mailer, now: at(100 + i * 0.01) }, { email: hourMailer(i), ipMac: ipMac(key, "198.51.100.9") });
        if (!r.ok && refusedAt < 0) refusedAt = i;
      }
      assert(refusedAt === 20, "one visitor can ask for at most 20 codes an hour", refusedAt);
      let capped = -1;
      for (let i = 0; i < 5; i++) {
        const r = await requestLoginCode(trx, { key, mailer, now: at(300 + i), limits: { requestsPerDayAll: 2 } }, { email: `sehari${i}@contoh.my`, ipMac: ipMac(key, `192.0.2.${i}`) });
        if (!r.ok && capped < 0) capped = i;
      }
      assert(capped >= 0 && capped <= 2, "the daily cap on all e-mails stops further codes", capped);
      for (let i = 0; i < 10; i++) await verifyLoginCode(trx, { key, now: at(500) }, { email: "dicuba@contoh.my", code: "123456", ipMac: ipMac(key, `203.0.113.${100 + i}`) });
      const blocked = await verifyLoginCode(trx, { key, now: at(501) }, { email: "dicuba@contoh.my", code: "123456", ipMac: ipMac(key, "203.0.113.250") });
      assert(blocked.status === "throttled", "ten wrong codes for one address in an hour stop further tries, from any visitor");

      // The mail provider fails.
      failMail = true;
      const down = await requestLoginCode(trx, { key, mailer, now: at(600) }, { email: "rosak@contoh.my", ipMac: ipMac(key, "203.0.113.55") });
      assert(!down.ok && down.reason === "mail_failed", "if the mail cannot be sent the caller is told");
      failMail = false;
      const open = await trx.selectFrom("reader_auth_challenges").select("id").where("email_lookup_mac", "=", emailLookupMac(key, "rosak@contoh.my")).where("consumed_at", "is", null).execute();
      assert(open.length === 0, "a code that was never delivered is retired");

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) { failed++; console.error("  ✗ unexpected error:", error); }
  } finally {
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed (nothing was saved, nothing was sent)`);
  if (failed) process.exit(1);
}

void main();
