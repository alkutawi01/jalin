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
import { confirmBatchPrinted, createBatch, createSharedCode, issueCodes, setRedeemHalted } from "../src/lib/reader-auth/redeem";
import { loadCodeKey } from "../src/lib/reader-auth/primitives";

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
    assert(good.status === 200 && good.json?.isNewAccount === true && !good.json?.trialEndsAt, "the right code registers the account with no trial yet");
    assert((await A.req("/api/akaun/saya")).json?.access?.state === "none", "a new account has no access");
    const beforeTrial = await new Device("anon").req("/api/akaun/percubaan", { method: "POST", body: {} });
    assert(beforeTrial.status === 401, "a visitor cannot start a trial");
    const crossSite = await A.req("/api/akaun/percubaan", { method: "POST", body: {}, origin: "https://contoh.invalid" });
    assert(crossSite.status === 403, "a trial cannot be started from another site");
    const started = await A.req("/api/akaun/percubaan", { method: "POST", body: {} });
    assert(started.status === 200 && started.json?.ok === true && !!started.json?.endsAt, "the reader starts the trial");
    good.json.trialEndsAt = started.json.endsAt;
    const trialDays = (new Date(started.json.endsAt).getTime() - Date.now()) / 86400000;
    assert(trialDays > 13.9 && trialDays < 14.1, "the trial is 14 days", trialDays);
    const startedAgain = await A.req("/api/akaun/percubaan", { method: "POST", body: {} });
    assert(startedAgain.status === 200 && startedAgain.json?.repeat === true && startedAgain.json?.endsAt === started.json.endsAt, "starting it again changes nothing");
    assert((await A.req("/api/akaun/saya")).json?.access?.state === "trial", "and the account is now in trial");
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
    const noneView = await G.req("/akaun");
    assert(gsign.verified?.status === 200 && (await G.req("/api/akaun/saya")).json.access.state === "none" && noneView.text.includes("Mulakan percubaan percuma"), "a new reader is shown without access and offered the trial");
    assert((await G.req("/api/akaun/percubaan", { method: "POST", body: {} })).status === 200, "the trial is started from the account");
    const trialView = await G.req("/akaun");
    assert((await G.req("/api/akaun/saya")).json.access.state === "trial" && trialView.text.includes("Percubaan percuma tamat"), "the reader is then shown as in trial with the date");
    const given = await addGrant(db, { accountId: gAcc.rows[0].id, kind: "ADMIN", grant: { unit: "months", amount: 6 }, reason: "e2e", createdBy: "e2e" });
    const afterGrant = await G.req("/api/akaun/saya");
    assert(given.added && afterGrant.json.access.state === "trial" && afterGrant.json.access.endsAt !== afterGrant.json.access.currentPeriodEndsAt && (await G.req("/akaun")).text.includes("bersambung sehingga"), "a grant added during the trial shows as continuing after it");
    await sql`UPDATE reader_accounts SET trial_ends_at = trial_ends_at`.execute(db);

    // ---------------------------------------------------------------- redeeming codes
    console.log("\nRedeeming codes");
    const key = loadCodeKey();
    const R = new Device("Penebus");
    await signIn(R, "e2e-tebus@e2e.invalid");
    assert((await R.req("/api/akaun/percubaan", { method: "POST", body: {} })).status === 200, "the redeeming reader starts the trial first, so the card is added after it");
    const batchMade = await createBatch(db, { codeKey: key }, { batchNumber: "E2E-001", months: 6, quantity: 3, createdBy: "e2e" });
    await confirmBatchPrinted(db, batchMade.batchId);
    await issueCodes(db, { batchId: batchMade.batchId });
    const pageVisitor = await v.req("/tebus");
    assert(pageVisitor.status === 307 && (pageVisitor.headers.get("location") ?? "").endsWith("/log-masuk"), "/tebus sends a visitor to /log-masuk");
    const pageReader = await R.req("/tebus");
    assert(pageReader.status === 200 && pageReader.text.includes("Tebus kod langganan") && /noindex/.test(pageReader.text), "/tebus shows the form to a signed-in reader and is noindex");
    assert((await R.req("/akaun")).text.includes('href="/tebus"'), "the account page links to /tebus");
    assert((await v.req("/api/akaun/tebus", { method: "POST", body: { code: batchMade.codes[0].code, batch: "E2E-001" } })).status === 401, "a visitor cannot redeem");
    assert((await R.req("/api/akaun/tebus", { method: "POST", body: { code: batchMade.codes[0].code, batch: "E2E-001" }, origin: "https://evil.example" })).status === 403, "a redeem request from another site is refused");
    for (const [label, raw] of [["not json", "{{{"], ["an array", "[1]"], ["empty", ""], ["a number", JSON.stringify({ code: 5 })]] as const) {
      assert((await R.req("/api/akaun/tebus", { method: "POST", raw })).status === 400, `redeeming with ${label} is a clean 400`);
    }
    await clearThrottle(); // every failed try counts toward the limit, so the earlier bad bodies are cleared before the next checks
    const refusedWrongBatch = await R.req("/api/akaun/tebus", { method: "POST", body: { code: batchMade.codes[0].code, batch: "E2E-999" } });
    const refusedNonsense = await R.req("/api/akaun/tebus", { method: "POST", body: { code: "bukan kod", batch: "E2E-001" } });
    assert(refusedWrongBatch.status === 400 && refusedNonsense.status === 400 && refusedWrongBatch.text === refusedNonsense.text, "a wrong batch and nonsense get the identical refusal");
    await clearThrottle();
    const okRedeem = await R.req("/api/akaun/tebus", { method: "POST", body: { code: batchMade.codes[0].code.toLowerCase(), batch: " e2e-001 " } });
    assert(okRedeem.status === 200 && okRedeem.json?.ok === true && /Kod berjaya ditebus\. Akses anda aktif sehingga .+\(MYT\)\./.test(okRedeem.json.message), "the right code and batch redeem with a message that gives the date", okRedeem.text);
    const afterRedeem = await R.req("/api/akaun/saya");
    assert(afterRedeem.json.access.state === "trial" && afterRedeem.json.access.endsAt !== afterRedeem.json.access.currentPeriodEndsAt, "the card period continues after the trial, as agreed");
    assert((await R.req("/akaun")).text.includes("bersambung sehingga"), "and the account page says so");
    const again = await R.req("/api/akaun/tebus", { method: "POST", body: { code: batchMade.codes[0].code, batch: "E2E-001" } });
    assert(again.status === 200 && again.json?.ok === true, "pressing it a second time is answered ok");
    const thief = new Device("Pencuri");
    await signIn(thief, "e2e-pencuri@e2e.invalid");
    await clearThrottle();
    const stolen = await thief.req("/api/akaun/tebus", { method: "POST", body: { code: batchMade.codes[0].code, batch: "E2E-001" } });
    assert(stolen.status === 400 && stolen.text === refusedNonsense.text, "another reader using the same code gets the same refusal as a nonsense code");
    const sharedMade = await createSharedCode(db, { grant: { unit: "days", amount: 7 }, maxRedemptions: 1, channel: "e2e" });
    const sharedOk = await thief.req("/api/akaun/tebus", { method: "POST", body: { code: sharedMade.code } });
    assert(sharedOk.status === 200 && sharedOk.json?.ok === true, "a shared code redeems with the code alone");
    assert((await thief.req("/api/akaun/tebus", { method: "POST", body: { code: sharedMade.code } })).status === 409, "the same reader using it again is told so");
    assert((await R.req("/api/akaun/tebus", { method: "POST", body: { code: sharedMade.code } })).status === 400, "when the limit is reached the next reader is refused like any wrong code");
    await setRedeemHalted(db, true, "e2e");
    assert((await R.req("/api/akaun/tebus", { method: "POST", body: { code: batchMade.codes[1].code, batch: "E2E-001" } })).status === 503, "with the stop switch on, redeeming answers 503");
    await setRedeemHalted(db, false, "e2e");
    await clearThrottle();
    await sql`DELETE FROM reader_auth_events WHERE kind = 'redeem_fail'`.execute(db);
    let limited = -1;
    for (let i = 0; i < 7; i++) { const r = await R.req("/api/akaun/tebus", { method: "POST", body: { code: "AAAA-AAAA-AAAA-AAAA-A", batch: "E2E-001" } }); if (r.status === 429 && limited < 0) limited = i; }
    assert(limited === 5, "after five wrong tries the answer is 429", limited);

    // ---------------------------------------------------------------- the admin: Langganan
    console.log("\nThe admin: Langganan");
    const admin = new Device("Admin");
    for (const p of ["/admin/langganan", "/admin/langganan/kad", "/admin/langganan/kod-kongsi", "/admin/langganan/pembaca"]) {
      const page = await admin.req(p);
      assert(page.status === 200 && page.text.includes("Langganan"), `${p} opens`, page.status);
    }
    assert((await admin.req("/admin/langganan")).text.includes("Suis henti penebusan"), "the overview has the stop switch");
    const preview = await admin.req("/api/admin/langganan/label-ujian?format=json");
    assert(preview.status === 200 && preview.json.layout.codeFontPt >= 8 && preview.json.layout.problems.length === 0, "the label preview reports the size the code gets", preview.json?.layout);
    const smallPreview = await admin.req("/api/admin/langganan/label-ujian?format=json&scratchWidthMm=26");
    assert(smallPreview.json.layout.problems.some((p: any) => p.level === "warning"), "a narrow strip is warned about");
    const testPdf = await fetch(`${BASE}/api/admin/langganan/label-ujian`);
    const testBytes = Buffer.from(await testPdf.arrayBuffer()).toString("latin1");
    assert(testPdf.status === 200 && testPdf.headers.get("content-type") === "application/pdf" && testBytes.startsWith("%PDF-1.4") && testBytes.includes("UJIAN"), "the test label comes as a PDF marked UJIAN");
    assert((await admin.req("/api/admin/langganan/label-ujian?widthMm=999")).status === 400, "a label size that cannot work is refused");

    const post = (body: unknown, path = "/api/admin/langganan/batch") => fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify(body) });
    assert((await post({ months: 3, quantity: 2 })).status === 400 && (await post({ months: 6, quantity: 0 })).status === 400 && (await post({ months: 6, quantity: 6000 })).status === 400, "a wrong length or quantity is refused before anything is made");
    assert((await post({ months: 6, quantity: 2, layout: { scratchWidthMm: 500 } })).status === 400, "an impossible layout is refused before anything is made");
    const none = await sql<{ n: string }>`SELECT count(*) AS n FROM code_batches`.execute(db);
    const small = await post({ months: 6, quantity: 2, batchNumber: "ADM-SMALL", layout: { scratchWidthMm: 28 } });
    assert(small.status === 409 && (await sql<{ n: string }>`SELECT count(*) AS n FROM code_batches`.execute(db)).rows[0].n === none.rows[0].n, "a code that would print too small waits for confirmation and makes no batch meanwhile");
    assert((await fetch(BASE + "/api/admin/langganan/batch", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ months: 6, quantity: 2 }) })).status === 403, "making a batch from another site is refused");

    const made = await post({ months: 6, quantity: 3, batchNumber: "adm-001", orderRef: "Ujian e2e", layout: {} });
    const pdfBytes = Buffer.from(await made.arrayBuffer()).toString("latin1");
    const batchId = made.headers.get("x-batch-id")!;
    assert(made.status === 200 && made.headers.get("content-type") === "application/pdf" && /no-store/.test(made.headers.get("cache-control") ?? "") && made.headers.get("x-batch-number") === "ADM-001" && made.headers.get("x-cards") === "3", "a batch is made and the PDF comes back, never cached");
    const printed = [...pdfBytes.matchAll(/\(([0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z])\) Tj/g)].map((m) => m[1]);
    const serials = [...pdfBytes.matchAll(/\(Batch ADM-001 (JLN-\d{2}-\d{6})\)/g)].map((m) => m[1]);
    assert((pdfBytes.match(/\/Type \/Page /g) ?? []).length === 3 && printed.length === 3 && serials.length === 3 && new Set(printed).size === 3, "the PDF has three pages with three different codes and serials");
    const asStored = await sql<{ n: string }>`SELECT count(*) AS n FROM redeem_codes WHERE batch_id = ${batchId}::uuid`.execute(db);
    const leaked = await sql<{ n: string }>`SELECT count(*) AS n FROM redeem_codes WHERE code_mac = ANY(${printed.map((c) => c.replace(/-/g, ""))}) OR serial = ANY(${printed})`.execute(db);
    assert(Number(asStored.rows[0].n) === 3 && Number(leaked.rows[0].n) === 0, "three codes are stored, and none of the printed codes is stored as it was printed");

    const X = new Device("Penebus admin");
    await signIn(X, "e2e-admin-tebus@e2e.invalid");
    await X.req("/api/akaun/percubaan", { method: "POST", body: {} });
    const tryRedeem = (code: string) => X.req("/api/akaun/tebus", { method: "POST", body: { code, batch: "adm-001" } });
    await clearThrottle();
    assert((await tryRedeem(printed[0])).status === 400, "a printed code does not work before the print is confirmed and the codes are switched on");
    assert((await post({ action: "issue" }, `/api/admin/langganan/batch/${batchId}`)).status === 409, "codes cannot be switched on before the print is confirmed");
    assert((await post({ action: "confirm" }, `/api/admin/langganan/batch/${batchId}`)).status === 200 && (await post({ action: "confirm" }, `/api/admin/langganan/batch/${batchId}`)).status === 409, "the print is confirmed once");
    const issuedOne = await post({ action: "issue", serials: [serials[0]] }, `/api/admin/langganan/batch/${batchId}`);
    assert(issuedOne.status === 200 && (await issuedOne.json()).issued === 1, "one card is switched on by its serial number");
    await clearThrottle();
    const real = await tryRedeem(printed[0]);
    assert(real.status === 200 && real.json?.ok === true, "the code printed on the label is the code that redeems", real.text);
    await clearThrottle();
    assert((await tryRedeem(printed[1])).status === 400, "a card that is not switched on does not redeem");
    const issuedRest = await post({ action: "issue" }, `/api/admin/langganan/batch/${batchId}`);
    assert(issuedRest.status === 200 && (await issuedRest.json()).issued === 2, "the rest are switched on together");
    const info = await admin.req(`/api/admin/langganan/kod/${serials[0]}`);
    assert(info.status === 200 && info.json.code.redeemedBy === "e2e-admin-tebus@e2e.invalid" && info.json.code.state === "issued", "the card found by serial shows who redeemed it");
    assert((await admin.req("/api/admin/langganan/kod/JLN-00-000000")).status === 404, "an unknown serial is not found");
    assert((await post({ action: "revoke", reason: "" }, `/api/admin/langganan/kod/${serials[1]}`)).status === 400, "cancelling a card needs a reason");
    assert((await post({ action: "revoke", reason: "Kad hilang" }, `/api/admin/langganan/kod/${serials[1]}`)).status === 200, "a lost card is cancelled");
    await clearThrottle();
    assert((await tryRedeem(printed[1])).status === 400, "the cancelled card no longer redeems");
    assert((await post({ action: "void", reason: "" }, `/api/admin/langganan/batch/${batchId}`)).status === 400 && (await post({ action: "void", reason: "Cetakan rosak" }, `/api/admin/langganan/batch/${batchId}`)).status === 200, "a batch is cancelled with a reason");
    await clearThrottle();
    assert((await tryRedeem(printed[2])).status === 400, "after the batch is cancelled its remaining card does not redeem");
    assert((await admin.req(`/api/admin/langganan/batch/${batchId}`, { method: "POST", body: { action: "dance" } })).status === 400 && (await post({ action: "confirm" }, "/api/admin/langganan/batch/not-a-uuid")).status === 400, "unknown actions and bad ids are refused cleanly");

    // Shared codes.
    assert((await post({ unit: "months", amount: 3, maxRedemptions: 5 }, "/api/admin/langganan/kod-kongsi")).status === 400 && (await post({ unit: "days", amount: 7, maxRedemptions: 0 }, "/api/admin/langganan/kod-kongsi")).status === 400 && (await post({ unit: "days", amount: 7, maxRedemptions: 5, expiresAt: "2020-01-01" }, "/api/admin/langganan/kod-kongsi")).status === 400, "a shared code with an unoffered length, no places or a day in the past is refused");
    const sharedCreated = await post({ unit: "days", amount: 14, maxRedemptions: 1, channel: "Telegram", expiresAt: "2099-12-31" }, "/api/admin/langganan/kod-kongsi");
    const sharedJson = await sharedCreated.json();
    assert(sharedCreated.status === 201 && /^JLN-[0-9A-Z]{7}$/.test(sharedJson.code), "a shared code is made");
    const list = await admin.req("/api/admin/langganan/kod-kongsi");
    const row = list.json.codes.find((c: any) => c.id === sharedJson.id);
    assert(row && row.maxRedemptions === 1 && row.redeemedCount === 0 && new Date(row.expiresAt).getTime() === Date.UTC(2099, 11, 31, 16, 0, 0), "it is listed, with its last day ending at midnight Malaysian time");
    assert((await admin.req(`/api/admin/langganan/kod-kongsi/${sharedJson.id}`, { method: "PATCH", body: { status: "paused" } })).status === 200, "it can be paused");
    await clearThrottle();
    assert((await X.req("/api/akaun/tebus", { method: "POST", body: { code: sharedJson.code } })).status === 400, "a paused code does not redeem");
    await admin.req(`/api/admin/langganan/kod-kongsi/${sharedJson.id}`, { method: "PATCH", body: { status: "active" } });
    assert((await X.req("/api/akaun/tebus", { method: "POST", body: { code: sharedJson.code } })).status === 200, "and works again once resumed");

    // The stop switch from the admin.
    assert((await admin.req("/api/admin/langganan/suis", { method: "POST", body: { halted: true } })).json?.halted === true && (await admin.req("/admin/langganan")).text.includes("dihentikan"), "the stop switch is switched on from the admin and shown");
    assert((await X.req("/api/akaun/tebus", { method: "POST", body: { code: sharedJson.code } })).status === 503, "and the reader endpoint answers 503");
    await admin.req("/api/admin/langganan/suis", { method: "POST", body: { halted: false } });
    assert((await admin.req("/api/admin/langganan/suis")).json?.halted === false, "and it is switched off again");

    // Finding a reader and changing their access.
    assert((await admin.req("/api/admin/langganan/pembaca?q=ab")).json.readers.length === 0, "a search under three letters finds nothing");
    const found = await admin.req("/api/admin/langganan/pembaca?q=ADMIN-TEBUS");
    assert(found.json.readers.length === 1 && found.json.readers[0].email === "e2e-admin-tebus@e2e.invalid", "a reader is found by part of the e-mail");
    assert((await admin.req("/api/admin/langganan/pembaca?q=%25%25%25")).json.readers.length === 0, "wildcard characters in a search are not wildcards");
    const readerId = found.json.readers[0].id;
    const detail = await admin.req(`/api/admin/langganan/pembaca/${readerId}`);
    assert(detail.json.reader.access.state === "trial" && detail.json.reader.ledger.length === 3 && detail.json.reader.devices === 1, "the reader's page shows the trial, the card and the shared code as separate periods", detail.json.reader.ledger.length);
    assert((await admin.req(`/api/admin/langganan/pembaca/${readerId}/beri`, { method: "POST", body: { unit: "months", amount: 1, reason: "" } })).status === 400, "giving access needs a reason");
    const gave = await admin.req(`/api/admin/langganan/pembaca/${readerId}/beri`, { method: "POST", body: { unit: "months", amount: 1, reason: "Ganti kad rosak" } });
    assert(gave.status === 200 && (await admin.req(`/api/admin/langganan/pembaca/${readerId}`)).json.reader.ledger.some((l: any) => l.kind === "ADMIN" && l.reason === "Ganti kad rosak"), "access is given with its reason");
    const cardPeriod = detail.json.reader.ledger.find((l: any) => l.kind === "CARD");
    assert((await admin.req(`/api/admin/langganan/entitlements/${cardPeriod.id}/batal`, { method: "POST", body: { reason: "" } })).status === 400, "cancelling a period needs a reason");
    assert((await admin.req(`/api/admin/langganan/entitlements/${cardPeriod.id}/batal`, { method: "POST", body: { reason: "Ujian pembatalan" } })).status === 200 && (await admin.req(`/api/admin/langganan/entitlements/${cardPeriod.id}/batal`, { method: "POST", body: { reason: "lagi" } })).status === 409, "a period is cancelled once");
    assert((await admin.req("/api/admin/langganan/pembaca/not-a-uuid")).status === 400 && (await admin.req("/api/admin/langganan/pembaca/00000000-0000-0000-0000-000000000000")).status === 404, "a bad or unknown reader id is refused cleanly");
    for (const [m, p] of [["POST", `/api/admin/langganan/pembaca/${readerId}/beri`], ["POST", `/api/admin/langganan/entitlements/${cardPeriod.id}/batal`], ["PATCH", `/api/admin/langganan/kod-kongsi/${sharedJson.id}`], ["POST", "/api/admin/langganan/suis"]] as const) {
      assert((await admin.req(p, { method: m, body: { halted: true, status: "revoked", reason: "x", unit: "days", amount: 7 }, origin: "https://evil.example" })).status === 403, `${m} ${p.replace(/[0-9a-f-]{36}/g, ":id")} from another site is refused`);
    }
    const trail = await sql<{ action: string }>`SELECT DISTINCT action FROM admin_activity WHERE action LIKE 'subscription.%'`.execute(db);
    assert(["subscription.batch.create", "subscription.batch.update", "subscription.code.revoke", "subscription.shared.create", "subscription.shared.update", "subscription.access.grant", "subscription.access.revoke", "subscription.switch"].every((a) => trail.rows.some((r) => r.action === a)), "every kind of change was recorded in Aktiviti", trail.rows.map((r) => r.action));
    const noCodes = await sql<{ n: string }>`SELECT count(*) AS n FROM admin_activity WHERE action LIKE 'subscription.%' AND summary ~* ${printed.map((c) => c.replace(/-/g, "[- ]?")).join("|")}`.execute(db);
    assert(Number(noCodes.rows[0].n) === 0, "no code appears in the activity record");

    // ---------------------------------------------------------------- the trial is once
    console.log("\nThe trial is given once");
    await sql`UPDATE reader_accounts SET status = 'deleted' WHERE email_normalized = ${emailA}`.execute(db);
    const F = new Device("Selepas padam");
    const f = await signIn(F, emailA);
    assert(f.verified?.status === 200 && f.verified.json?.isNewAccount === true && f.verified.json?.trialEndsAt === null, "registering again after deleting the account starts clean");
    const second = await F.req("/api/akaun/percubaan", { method: "POST", body: {} });
    assert(second.status === 409, "and cannot start a second trial: the address has used it", second.status);
    assert((await F.req("/akaun")).text.includes("Tiada nama"), "and the new account starts clean (no old name)");

    // ---------------------------------------------------------------- the database refuses a wrong host
    console.log("\nThe local guard");
    const { assertDatabaseAllowedHere } = await import("../src/lib/db/env");
    let refused = false;
    try { assertDatabaseAllowedHere(new URL("postgresql://u:p@ep-some-production-pooler.c-4.ap-southeast-1.aws.neon.tech/db"), "DATABASE_URL", {}); } catch { refused = true; }
    assert(refused, "a non-development database host is refused outside Vercel and CI");
  } finally {
    const del = await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@e2e.invalid'`.execute(db);
    await sql`TRUNCATE redemptions, shared_redemptions, redeem_codes, code_batches, shared_codes, entitlements`.execute(db);
    await sql`DELETE FROM reader_switches WHERE key = 'redeem_halted'`.execute(db);
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
