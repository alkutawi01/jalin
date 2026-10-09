/**
 * End-to-end simulation of reader accounts against a RUNNING dev server (several "devices", each with its own cookie jar), plus a
 * check that the rest of the site still answers. Local work only reaches the development database (src/lib/db/env.ts).
 *
 *   1. start the site with the mail printed in a log:  npx next dev -p 3100 > dev.log
 *   2. READER_E2E_BASE=http://localhost:3100 READER_E2E_LOG=dev.log npx tsx scripts/reader-e2e.ts
 *
 * Optionally READER_E2E_OFF_BASE=http://localhost:3101 is a second server started with READER_ACCOUNTS_ENABLED=no.
 * Every account it makes uses an address ending @e2e.invalid and is deleted at the end.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import fs from "node:fs";
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { addGrant, listLedger } from "../src/lib/reader-auth/entitlements";

const BASE = process.env.READER_E2E_BASE ?? "http://localhost:3100";
const OFF_BASE = process.env.READER_E2E_OFF_BASE;
const LOG = process.env.READER_E2E_LOG ?? "dev.log";
const HOST = new URL(BASE).host;

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const db = getDb();

class Device {
  jar: Record<string, string> = {};
  constructor(public name: string) {}
  cookie() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  async req(path: string, init: { method?: string; body?: unknown; origin?: string | null; raw?: string; base?: string } = {}) {
    const headers: Record<string, string> = { cookie: this.cookie() };
    if (init.origin !== null) headers.origin = init.origin ?? (init.base ?? BASE);
    if (init.body !== undefined || init.raw !== undefined) headers["content-type"] = "application/json";
    const res = await fetch((init.base ?? BASE) + path, {
      method: init.method ?? "GET",
      headers,
      body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      redirect: "manual",
    });
    const setCookies = res.headers.getSetCookie();
    for (const c of setCookies) {
      const [pair] = c.split(";");
      const [k, ...v] = pair.split("=");
      if (/max-age=0/i.test(c)) delete this.jar[k]; else this.jar[k] = v.join("=");
    }
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, text, json, headers: res.headers, setCookies };
  }
}

function lastCodeFor(email: string): string | null {
  const lines = fs.readFileSync(LOG, "utf8").split(/\r?\n/).filter((l) => l.includes("[mail:console]") && l.includes(` ${email}:`));
  const m = lines.length ? /: (\d{6}) \(sah/.exec(lines[lines.length - 1]) : null;
  return m ? m[1] : null;
}
const mailCountFor = (email: string) => fs.readFileSync(LOG, "utf8").split(/\r?\n/).filter((l) => l.includes("[mail:console]") && l.includes(` ${email}:`)).length;
async function clearThrottle() { await sql`DELETE FROM reader_auth_events`.execute(db); }

async function signIn(device: Device, email: string, extra: Record<string, unknown> = {}) {
  await clearThrottle();
  const before = mailCountFor(email);
  const asked = await device.req("/api/akaun/kod", { method: "POST", body: { email } });
  await sleep(300);
  const code = mailCountFor(email) > before ? lastCodeFor(email) : null;
  const verified = code ? await device.req("/api/akaun/sahkan", { method: "POST", body: { email, code, label: device.name, ...extra } }) : null;
  return { asked, code, verified };
}

async function main() {
  const emailA = "e2e-aina@e2e.invalid";
  try {
    // ---------------------------------------------------------------- the switch
    console.log("\nSwitch off");
    if (OFF_BASE) {
      const d = new Device("off");
      const home = await d.req("/", { base: OFF_BASE });
      assert(home.status === 200 && !home.text.includes('href="/akaun"'), "with the switch off the home page works and has no Akaun link");
      for (const p of ["/log-masuk", "/akaun", "/api/akaun/saya"]) assert((await d.req(p, { base: OFF_BASE })).status === 404, `${p} is 404 when off`);
      assert((await d.req("/api/akaun/kod", { method: "POST", body: { email: emailA }, base: OFF_BASE })).status === 404, "asking for a code is 404 when off");
    } else console.log("  (skipped: READER_E2E_OFF_BASE not set)");

    // ---------------------------------------------------------------- the rest of the site
    console.log("\nThe rest of the site still answers");
    const v = new Device("visitor");
    const home = await v.req("/");
    assert(home.status === 200 && home.text.includes('href="/akaun"'), "home page 200 and shows the Akaun link when the switch is on");
    for (const p of ["/kategori/cerpen", "/kategori/novela", "/kategori/bersiri", "/tentang", "/privasi", "/terma", "/cari?q=jalin", "/api/cari/cadangan?q=a", "/sitemap.xml", "/robots.txt", "/admin/login"]) {
      const r = await v.req(p);
      assert(r.status === 200, `${p} answers 200`, r.status);
    }
    const links = [...home.text.matchAll(/href="(\/kategori\/cerpen\/[a-z0-9-]+)"/g)].map((m) => m[1]);
    if (links.length) { const w = await v.req(links[0]); assert(w.status === 200 && !w.text.includes("jalin-reader"), `a story page (${links[0]}) answers 200 and sets no reader cookie`); }
    const adminApi = await v.req("/api/admin/works");
    const devBypass = process.env.ADMIN_DEV_BYPASS === "true" && !process.env.READER_E2E_PRODUCTION;
    assert(devBypass ? adminApi.status === 200 : adminApi.status === 401, devBypass ? "the admin API answers (local dev bypass is on, as before)" : "the admin API still refuses a visitor", adminApi.status);
    const sitemap = (await v.req("/sitemap.xml")).text;
    assert(!sitemap.includes("/akaun") && !sitemap.includes("/log-masuk"), "the sitemap does not list the account pages");

    // ---------------------------------------------------------------- visitor
    console.log("\nA visitor");
    const gate = await v.req("/akaun");
    assert(gate.status === 307 && (gate.headers.get("location") ?? "").endsWith("/log-masuk"), "/akaun sends a visitor to /log-masuk");
    const login = await v.req("/log-masuk");
    assert(login.status === 200 && /noindex/.test(login.text) && login.text.includes("Log masuk atau daftar"), "/log-masuk shows the form and is noindex");
    const me0 = await v.req("/api/akaun/saya");
    assert(me0.json?.signedIn === false && /no-store/.test(me0.headers.get("cache-control") ?? ""), "/saya says signedIn false and is never cached");

    // ---------------------------------------------------------------- foreign origins
    console.log("\nRequests from other sites");
    for (const [p, body] of [["/api/akaun/kod", { email: emailA }], ["/api/akaun/sahkan", { email: emailA, code: "123456" }], ["/api/akaun/keluar", {}], ["/api/akaun/keluar-semua", {}], ["/api/akaun/peranti/keluarkan", { deviceId: "x" }], ["/api/akaun/profil", { displayName: "x" }]] as const) {
      const method = p.endsWith("profil") ? "PATCH" : "POST";
      assert((await v.req(p, { method, body, origin: "https://evil.example" })).status === 403, `${method} ${p} from another site is refused`);
      assert((await v.req(p, { method, body, origin: null })).status === 403, `${method} ${p} without an Origin is refused`);
    }
    assert((await v.req("/api/akaun/tetapan", { method: "PUT", body: { theme: "gelap" }, origin: "https://evil.example" })).status === 403, "PUT /tetapan from another site is refused");

    // ---------------------------------------------------------------- bad input
    console.log("\nBad input never causes a server error");
    await clearThrottle();
    const badBodies: [string, string][] = [["not json", "{{{"], ["an array", "[1,2]"], ["empty", ""], ["a huge body", JSON.stringify({ email: "a".repeat(10000) })], ["null email", JSON.stringify({ email: null })], ["a number", JSON.stringify({ email: 5 })]];
    for (const [label, raw] of badBodies) {
      const r = await v.req("/api/akaun/kod", { method: "POST", raw });
      assert(r.status === 400, `code request with ${label} is a clean 400`, r.status);
      const s = await v.req("/api/akaun/sahkan", { method: "POST", raw });
      assert(s.status === 400, `verification with ${label} is a clean 400`, s.status);
    }
    assert((await v.req("/api/akaun/kod", { method: "POST", body: { email: "a b@c.my" } })).status === 400, "an address with a space is refused");
    assert((await v.req("/api/akaun/kod", { method: "POST", body: { email: "x@y.my\r\nBcc: z@y.my" } })).status === 400, "a header-injection address is refused");

    // ---------------------------------------------------------------- registration
    console.log("\nRegistration by one-time code");
    const A = new Device("Telefon Aina");
    await clearThrottle();
    const ask = await A.req("/api/akaun/kod", { method: "POST", body: { email: emailA } });
    await sleep(300);
    const code1 = lastCodeFor(emailA);
    assert(ask.status === 200 && ask.json?.ok === true && !!code1, "a code is requested and mailed");
    const wrong = await A.req("/api/akaun/sahkan", { method: "POST", body: { email: emailA, code: code1 === "000000" ? "000001" : "000000" } });
    assert(wrong.status === 400 && !A.jar["jalin-reader"], "a wrong code is refused and sets no cookie");
    const good = await A.req("/api/akaun/sahkan", { method: "POST", body: { email: emailA, code: code1, label: "Telefon Aina" } });
    assert(good.status === 200 && good.json?.isNewAccount === true && !!good.json?.trialEndsAt, "the right code registers the account with a trial");
    const trialDays = (new Date(good.json.trialEndsAt).getTime() - Date.now()) / 86400000;
    assert(trialDays > 13.9 && trialDays < 14.1, "the trial is 14 days", trialDays);
    const cookie = good.setCookies.find((c) => c.startsWith("jalin-reader="))!;
    assert(!!cookie && /HttpOnly/i.test(cookie) && /SameSite=lax/i.test(cookie) && /Path=\//i.test(cookie) && !/Domain=/i.test(cookie), "the cookie is HttpOnly, SameSite=Lax, Path=/, with no Domain", cookie);
    const acct = await sql<{ id: string }>`SELECT id FROM reader_accounts WHERE email_normalized = ${emailA} AND status <> 'deleted'`.execute(db);
    const ledgerRows = await listLedger(db, acct.rows[0].id);
    assert(ledgerRows.length === 1 && ledgerRows[0].kind === "TRIAL" && Math.abs(ledgerRows[0].endsAt.getTime() - new Date(good.json.trialEndsAt).getTime()) < 1000, "registration wrote the 14-day trial into the access ledger");
    const reuse = await new Device("x").req("/api/akaun/sahkan", { method: "POST", body: { email: emailA, code: code1 } });
    assert(reuse.status === 400, "the same code cannot be used twice");
    const me = await A.req("/api/akaun/saya");
    assert(me.json?.signedIn === true && me.json.account.email === emailA && me.json.devices.length === 1, "/saya shows the account and one device");
    const page = await A.req("/akaun");
    assert(page.status === 200 && page.text.includes(emailA) && page.text.includes("Akaun saya"), "/akaun shows the signed-in reader");
    const redirectBack = await A.req("/log-masuk");
    assert(redirectBack.status === 307 && (redirectBack.headers.get("location") ?? "").endsWith("/akaun"), "a signed-in reader is sent from /log-masuk to /akaun");
    const forged = new Device("forged"); forged.jar["jalin-reader"] = "A".repeat(43);
    assert((await forged.req("/api/akaun/saya")).json?.signedIn === false, "a forged cookie is not a session");

    // ---------------------------------------------------------------- not revealing accounts
    console.log("\nNo giving away who has an account");
    await clearThrottle();
    const knownAnswer = await new Device("k").req("/api/akaun/kod", { method: "POST", body: { email: emailA } });
    const unknownAnswer = await new Device("u").req("/api/akaun/kod", { method: "POST", body: { email: "e2e-tiada@e2e.invalid" } });
    assert(knownAnswer.status === unknownAnswer.status && JSON.stringify(knownAnswer.json) === JSON.stringify(unknownAnswer.json), "the answer is identical for an address with an account and one without");
    const cooled = await new Device("c").req("/api/akaun/kod", { method: "POST", body: { email: emailA } });
    assert(cooled.status === knownAnswer.status && JSON.stringify(cooled.json) === JSON.stringify(knownAnswer.json), "a throttled request looks the same as an accepted one");

    // ---------------------------------------------------------------- rate limits
    console.log("\nRate limits");
    await clearThrottle();
    const rl = "e2e-hujan@e2e.invalid";
    const before = mailCountFor(rl);
    const r1 = await new Device("r").req("/api/akaun/kod", { method: "POST", body: { email: rl } });
    for (let i = 0; i < 5; i++) await new Device("r").req("/api/akaun/kod", { method: "POST", body: { email: rl } });
    await sleep(500);
    assert(r1.status === 200 && mailCountFor(rl) - before === 1, "six quick requests for one address send exactly one mail (60-second cooldown)", mailCountFor(rl) - before);

    // ---------------------------------------------------------------- expiry and attempts
    console.log("\nExpiry and wrong tries");
    const ex = "e2e-tamat@e2e.invalid";
    await clearThrottle();
    await new Device("e").req("/api/akaun/kod", { method: "POST", body: { email: ex } });
    await sleep(300);
    const exCode = lastCodeFor(ex);
    await sql`UPDATE reader_auth_challenges SET expires_at = now() - interval '1 minute', created_at = now() - interval '6 minutes' WHERE consumed_at IS NULL`.execute(db);
    assert((await new Device("e").req("/api/akaun/sahkan", { method: "POST", body: { email: ex, code: exCode } })).status === 400, "a code past five minutes is refused");
    const at = "e2e-cuba@e2e.invalid";
    await clearThrottle();
    await new Device("t").req("/api/akaun/kod", { method: "POST", body: { email: at } });
    await sleep(300);
    const atCode = lastCodeFor(at)!;
    const bad = atCode === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++) await new Device("t").req("/api/akaun/sahkan", { method: "POST", body: { email: at, code: bad } });
    assert((await new Device("t").req("/api/akaun/sahkan", { method: "POST", body: { email: at, code: atCode } })).status === 400, "after five wrong tries even the right code is refused");

    // ---------------------------------------------------------------- the same code twice at once
    console.log("\nOne code, eight requests at once");
    const cc = "e2e-serentak@e2e.invalid";
    await clearThrottle();
    await new Device("p").req("/api/akaun/kod", { method: "POST", body: { email: cc } });
    await sleep(300);
    const ccCode = lastCodeFor(cc)!;
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => new Device(`p${i}`).req("/api/akaun/sahkan", { method: "POST", body: { email: cc, code: ccCode, label: `P${i}` } })));
    const wins = results.filter((r) => r.status === 200 && r.json?.ok).length;
    const accounts = await sql<{ n: string }>`SELECT count(*) AS n FROM reader_accounts WHERE email_normalized = ${cc}`.execute(db);
    const devs = await sql<{ n: string }>`SELECT count(*) AS n FROM reader_devices d JOIN reader_accounts a ON a.id = d.account_id WHERE a.email_normalized = ${cc} AND d.revoked_at IS NULL`.execute(db);
    assert(wins === 1 && Number(accounts.rows[0].n) === 1 && Number(devs.rows[0].n) === 1, "exactly one request wins: one account, one device", { wins, accounts: accounts.rows[0].n, devices: devs.rows[0].n });

    // ---------------------------------------------------------------- two devices, then a third
    console.log("\nTwo devices, then a third");
    const B = new Device("Komputer riba");
    const b = await signIn(B, emailA, { label: "Komputer riba" });
    assert(b.verified?.status === 200 && b.verified.json?.isNewAccount === false, "a second device signs in to the same account");
    const both = await A.req("/api/akaun/saya");
    assert(both.json?.devices.length === 2, "both devices are listed");
    const C = new Device("Tablet");
    const c1 = await signIn(C, emailA, { label: "Tablet" });
    assert(c1.verified?.status === 200 && c1.verified.json?.needsDeviceChoice === true && c1.verified.json.devices.length === 2 && !C.jar["jalin-reader"], "a third device is asked to choose; no cookie yet");
    const ids: string[] = c1.verified!.json.devices.map((d: any) => d.id);
    // someone else's device cannot be named
    const other = new Device("Orang lain");
    const o = await signIn(other, "e2e-lain@e2e.invalid");
    const otherId = (await other.req("/api/akaun/saya")).json.thisDeviceId;
    const foreign = await C.req("/api/akaun/sahkan", { method: "POST", body: { email: emailA, code: c1.code, label: "Tablet", replaceDeviceId: otherId } });
    assert(o.verified?.status === 200 && foreign.status === 400 && !C.jar["jalin-reader"], "naming a device of another account is refused");
    const stillChoose = await C.req("/api/akaun/sahkan", { method: "POST", body: { email: emailA, code: c1.code, label: "Tablet" } });
    assert(stillChoose.json?.needsDeviceChoice === true, "the same code still works after a refused choice");
    const aId = (await A.req("/api/akaun/saya")).json.thisDeviceId;
    assert(ids.includes(aId), "the first device is among the choices");
    const chosen = await C.req("/api/akaun/sahkan", { method: "POST", body: { email: emailA, code: c1.code, label: "Tablet", replaceDeviceId: aId } });
    assert(chosen.status === 200 && chosen.json?.ok === true && !!C.jar["jalin-reader"], "choosing the first device lets the third in");
    assert((await A.req("/api/akaun/saya")).json?.signedIn === false, "the replaced device is signed out at once");
    assert((await A.req("/akaun")).status === 307, "and its account page now sends it to /log-masuk");
    assert((await C.req("/api/akaun/saya")).json?.devices.length === 2, "the account still has exactly two devices");

    // ---------------------------------------------------------------- settings and name
    console.log("\nSettings and name");
    const set = await C.req("/api/akaun/tetapan", { method: "PUT", body: { theme: "gelap", fontSizePx: 22, dimPercent: 10, fontFamily: "sans", lineHeightX100: 200, textWidthCh: 74 } });
    assert(set.status === 200 && set.json.prefs.theme === "gelap" && set.json.prefs.fontSizePx === 22 && set.json.prefs.dimPercent === 10, "valid settings are saved");
    const junk = await C.req("/api/akaun/tetapan", { method: "PUT", body: { theme: "<script>", fontSizePx: 999, dimPercent: 7, fontFamily: "comic", lineHeightX100: "x", textWidthCh: null, extra: 1 } });
    assert(junk.status === 200 && junk.json.prefs.theme === "gelap" && junk.json.prefs.fontSizePx === 22 && junk.json.prefs.dimPercent === 10, "values that are not on offer are ignored and the old ones kept");
    const Bback = await B.req("/api/akaun/tetapan");
    assert(Bback.json?.prefs.theme === "gelap" && Bback.json.prefs.fontSizePx === 22, "the other device sees the same settings (they belong to the account)");
    assert((await v.req("/api/akaun/tetapan")).status === 401, "a visitor cannot read settings");
    assert((await v.req("/api/akaun/tetapan", { method: "PUT", body: { theme: "gelap" } })).status === 401, "a visitor cannot change settings");
    const nm = await C.req("/api/akaun/profil", { method: "PATCH", body: { displayName: '  <img src=x onerror=alert(1)>  Aina   Binti  ' } });
    assert(nm.status === 200 && nm.json.displayName === "<img src=x onerror=alert(1)> Aina Binti", "the name is tidied (spaces) and stored as plain text");
    const html = (await C.req("/akaun")).text;
    assert(!html.includes("<img src=x onerror") && html.includes("&lt;img src=x onerror"), "the page shows the name as text, never as markup");
    assert((await C.req("/api/akaun/profil", { method: "PATCH", body: { displayName: "x".repeat(500) } })).json.displayName.length === 60, "a name is cut at 60 characters");

    // ---------------------------------------------------------------- removing devices
    console.log("\nRemoving devices");
    const mine = (await C.req("/api/akaun/saya")).json;
    const bId = (await B.req("/api/akaun/saya")).json.thisDeviceId;
    assert((await C.req("/api/akaun/peranti/keluarkan", { method: "POST", body: { deviceId: mine.thisDeviceId } })).status === 400, "the device in use cannot be removed this way");
    assert((await C.req("/api/akaun/peranti/keluarkan", { method: "POST", body: { deviceId: otherId } })).status === 404, "a device of another account cannot be removed");
    assert((await C.req("/api/akaun/peranti/keluarkan", { method: "POST", body: { deviceId: "tidak-sah" } })).status !== 200, "a nonsense id is refused");
    assert((await C.req("/api/akaun/peranti/keluarkan", { method: "POST", body: { deviceId: bId } })).status === 200, "the other device is removed");
    assert((await B.req("/api/akaun/saya")).json?.signedIn === false, "and it is signed out at once");
    assert((await other.req("/api/akaun/saya")).json?.signedIn === true, "the other account was not touched");

    // ---------------------------------------------------------------- signing out
    console.log("\nSigning out");
    const D = new Device("Telefon kedua");
    await signIn(D, emailA, { label: "Telefon kedua" });
    assert((await D.req("/api/akaun/saya")).json?.signedIn === true && (await C.req("/api/akaun/saya")).json?.devices.length === 2, "two devices again");
    const out = await D.req("/api/akaun/keluar", { method: "POST", body: {} });
    assert(out.status === 200 && out.setCookies.some((c) => /jalin-reader=;/.test(c) && /max-age=0/i.test(c)) && !D.jar["jalin-reader"], "sign out clears the cookie");
    assert((await C.req("/api/akaun/saya")).json?.signedIn === true, "signing out one device leaves the other signed in");
    const E = new Device("Peranti lain");
    await signIn(E, emailA);
    const all = await E.req("/api/akaun/keluar-semua", { method: "POST", body: {} });
    assert(all.status === 200, "sign out everywhere answers 200");
    assert((await C.req("/api/akaun/saya")).json?.signedIn === false && (await E.req("/api/akaun/saya")).json?.signedIn === false, "every device is signed out");
    assert((await new Device("z").req("/api/akaun/keluar-semua", { method: "POST", body: {} })).status === 401, "a visitor cannot sign anyone out everywhere");

    // ---------------------------------------------------------------- the ledger on the account page
    console.log("\nAccess shown on the account page");
    const G = new Device("Pembaca langganan");
    const gsign = await signIn(G, "e2e-langgan@e2e.invalid");
    const gAcc = await sql<{ id: string }>`SELECT id FROM reader_accounts WHERE email_normalized = 'e2e-langgan@e2e.invalid'`.execute(db);
    const trialView = await G.req("/akaun");
    assert(gsign.verified?.status === 200 && (await G.req("/api/akaun/saya")).json.access.state === "trial" && trialView.text.includes("Percubaan percuma tamat"), "a new reader is shown as in trial with the date");
    const given = await addGrant(db, { accountId: gAcc.rows[0].id, kind: "ADMIN", grant: { unit: "months", amount: 6 }, reason: "e2e", createdBy: "e2e" });
    const afterGrant = await G.req("/api/akaun/saya");
    assert(given.added && afterGrant.json.access.state === "trial" && afterGrant.json.access.endsAt !== afterGrant.json.access.currentPeriodEndsAt && (await G.req("/akaun")).text.includes("bersambung sehingga"), "a grant added during the trial shows as continuing after it");
    await sql`UPDATE reader_accounts SET trial_ends_at = trial_ends_at`.execute(db);

    // ---------------------------------------------------------------- the trial is once
    console.log("\nThe trial is given once");
    await sql`UPDATE reader_accounts SET status = 'deleted' WHERE email_normalized = ${emailA}`.execute(db);
    const F = new Device("Selepas padam");
    const f = await signIn(F, emailA);
    assert(f.verified?.status === 200 && f.verified.json?.isNewAccount === true && f.verified.json?.trialEndsAt === null, "registering again after deleting the account gets no second trial");
    assert((await F.req("/akaun")).text.includes("Tiada nama"), "and the new account starts clean (no old name)");

    // ---------------------------------------------------------------- the database refuses a wrong host
    console.log("\nThe local guard");
    const { assertDatabaseAllowedHere } = await import("../src/lib/db/env");
    let refused = false;
    try { assertDatabaseAllowedHere(new URL("postgresql://u:p@ep-some-production-pooler.c-4.ap-southeast-1.aws.neon.tech/db"), "DATABASE_URL", {}); } catch { refused = true; }
    assert(refused, "a non-development database host is refused outside Vercel and CI");
  } finally {
    const del = await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@e2e.invalid'`.execute(db);
    await sql`TRUNCATE entitlements`.execute(db);
    await sql`DELETE FROM reader_auth_challenges`.execute(db);
    await sql`DELETE FROM reader_auth_events`.execute(db);
    await sql`DELETE FROM reader_trial_claims`.execute(db);
    console.log(`\n(cleaned ${del.numAffectedRows} test accounts)`);
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

void main().catch(async (error) => {
  console.error("unexpected error:", error);
  try { await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@e2e.invalid'`.execute(db); await closeDb(); } catch { /* ignore */ }
  process.exit(1);
});
