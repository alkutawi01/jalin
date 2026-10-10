/**
 * The paywall, end to end, against a RUNNING dev server (reader accounts on, mail printed in a log). Local work only reaches the
 * development database (src/lib/db/env.ts).
 *
 *   1. start the site with the mail printed in a log:  NEXT_DIST_DIR=.next-test npx next dev -p 3100 > dev.log
 *   2. READER_E2E_BASE=http://localhost:3100 READER_E2E_LOG=dev.log npx tsx scripts/paywall-check.ts
 *
 * It switches the paywall on for the time of the run, marks one work as a sample, and puts everything back at the end. Every account
 * it makes uses an address ending @pw.invalid and is deleted at the end. The text of a work is searched for a phrase that appears
 * nowhere else (a canary): a locked page, its RSC payload and the search results must never contain it.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import fs from "node:fs";
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { createSharedCode } from "../src/lib/reader-auth/redeem";
import { isPaywallSwitchOn, setPaywall, setSample } from "../src/lib/reader-auth/switches";
import { safeNextPath } from "../src/lib/reader-auth/next-path";

const BASE = process.env.READER_E2E_BASE ?? "http://localhost:3100";
const LOG = process.env.READER_E2E_LOG ?? "dev.log";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const db = getDb();

class Device {
  jar: Record<string, string> = {};
  cookie() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  async req(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { cookie: this.cookie(), origin: BASE, ...(init.headers ?? {}) };
    if (init.body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(BASE + path, { method: init.method ?? "GET", headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, ...v] = pair.split("=");
      if (/max-age=0/i.test(c)) delete this.jar[k]; else this.jar[k] = v.join("=");
    }
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, text, json, headers: res.headers };
  }
}

const lastCodeFor = (email: string) => {
  const lines = fs.readFileSync(LOG, "utf8").split(/\r?\n/).filter((l) => l.includes("[mail:console]") && l.includes(` ${email}:`));
  const m = lines.length ? /: (\d{6}) \(sah/.exec(lines[lines.length - 1]) : null;
  return m ? m[1] : null;
};
const mailCountFor = (email: string) => fs.readFileSync(LOG, "utf8").split(/\r?\n/).filter((l) => l.includes("[mail:console]") && l.includes(` ${email}:`)).length;

async function signIn(device: Device, email: string) {
  await sql`DELETE FROM reader_auth_events`.execute(db);
  const before = mailCountFor(email);
  await device.req("/api/akaun/kod", { method: "POST", body: { email } });
  await sleep(350);
  const code = mailCountFor(email) > before ? lastCodeFor(email) : null;
  if (!code) throw new Error(`no code was mailed to ${email}`);
  const res = await device.req("/api/akaun/sahkan", { method: "POST", body: { email, code, label: "Ujian" } });
  if (res.status !== 200) throw new Error(`sign-in failed for ${email}: ${res.status} ${res.text.slice(0, 120)}`);
}

/** Four plain words in a row from the middle of the text (no quotes or dashes the page might set differently). */
function canaryOf(body: string): string | null {
  const words = body.replace(/[#*_>`\[\]()]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length < 60) return null;
  const clean = (w: string) => /^[A-Za-z]{2,}$/.test(w);
  for (let i = Math.floor(words.length / 3); i < words.length - 4; i++) {
    const run = words.slice(i, i + 4);
    if (run.every(clean) && run.join(" ").length >= 18) return run.join(" ");
  }
  return null;
}

async function main() {
  const originalPaywall = await isPaywallSwitchOn(db);
  const touchedSamples: string[] = [];
  try {
    // ------------------------------------------------------------ pure parts
    console.log("\nWhere to go after signing in");
    assert(safeNextPath("/kategori/cerpen/a") === "/kategori/cerpen/a", "a path on this site is kept");
    assert(safeNextPath("//evil.example") === "/akaun" && safeNextPath("/\\evil.example") === "/akaun" && safeNextPath("https://evil.example") === "/akaun", "another site is refused");
    assert(safeNextPath("javascript:alert(1)") === "/akaun" && safeNextPath("/a\nb") === "/akaun" && safeNextPath(undefined) === "/akaun" && safeNextPath("x".repeat(400)) === "/akaun", "anything odd becomes the fallback");

    // ------------------------------------------------------------ find two published works with text
    const works = await sql<{ slug: string; type: string; title: string; body: string }>`
      SELECT slug, type, title, body FROM works WHERE status = 'published' AND type IN ('cerpen', 'fragmen', 'sinopsis') AND length(body) > 300 ORDER BY type, slug LIMIT 40`.execute(db);
    const candidates = works.rows.map((w) => ({ ...w, canary: canaryOf(w.body) })).filter((w) => !!w.canary);
    if (candidates.length < 2) throw new Error("need two published works with text in the development database");
    const locked = candidates[0];
    const sample = candidates[1];
    const lockedPath = `/kategori/${locked.type}/${locked.slug}`;
    const samplePath = `/kategori/${sample.type}/${sample.slug}`;
    const visitor = new Device();

    // ------------------------------------------------------------ paywall off: nothing changes
    console.log("\nPaywall off");
    await setPaywall(db, false, "paywall-check");
    const open = await visitor.req(lockedPath);
    assert(open.status === 200 && open.text.includes(locked.canary!.slice(0, 28)), "with the paywall off a visitor reads the text");

    // ------------------------------------------------------------ paywall on
    console.log("\nPaywall on: a visitor");
    await setPaywall(db, true, "paywall-check");
    await setSample(db, sample.slug, true, "paywall-check");
    touchedSamples.push(sample.slug);
    const page = await visitor.req(lockedPath);
    assert(page.status === 200, "a locked work answers 200 (it is a page, not an error)", page.status);
    assert(!page.text.includes(locked.canary!.slice(0, 28)), "the HTML does not contain the text");
    assert(page.text.includes("Log masuk untuk membaca") && page.text.includes(locked.title.slice(0, 20)), "it shows the title and the way in");
    const rsc = await visitor.req(lockedPath, { headers: { RSC: "1", "Next-Router-State-Tree": "%5B%22%22%5D" } });
    assert(!rsc.text.includes(locked.canary!.slice(0, 28)), "the RSC payload does not contain the text");
    const samplePage = await visitor.req(samplePath);
    assert(samplePage.status === 200 && samplePage.text.includes(sample.canary!.slice(0, 28)), "a sample is open to a visitor");
    const search = await visitor.req(`/cari?q=${encodeURIComponent(locked.canary!.slice(0, 28))}`);
    assert(search.status === 200 && !search.text.includes(`href="${lockedPath}"`), "search by a sentence of a locked text finds nothing", search.status);
    const searchTitle = await visitor.req(`/cari?q=${encodeURIComponent(locked.title.slice(0, 12))}`);
    assert(searchTitle.status === 200 && searchTitle.text.includes(locked.slug), "search by title still finds it");
    const suggest = await visitor.req(`/api/cari/cadangan?q=${encodeURIComponent(locked.title.slice(0, 10))}`);
    assert(suggest.status === 200 && (suggest.headers.get("cache-control") ?? "").includes("no-store"), "suggestions are not kept in a shared cache");
    const landing = await visitor.req("/mula");
    assert(landing.status === 200 && landing.text.includes("Mula membaca") && landing.text.includes(sample.title.slice(0, 15)), "the landing page shows the samples");
    assert(!landing.text.includes(locked.title), "and not the locked works");
    const loginNext = await visitor.req(`/log-masuk?next=${encodeURIComponent(lockedPath)}`);
    assert(loginNext.status === 200, "the sign-in page accepts a way back");

    // ------------------------------------------------------------ a reader without access
    console.log("\nA signed-in reader with no access yet");
    const A = new Device();
    const emailA = "pw-a@pw.invalid";
    await signIn(A, emailA);
    const noTrial = await A.req(lockedPath);
    assert(noTrial.status === 200 && !noTrial.text.includes(locked.canary!.slice(0, 28)) && noTrial.text.includes("Mulakan percubaan percuma"), "signed in, still locked, and offered the trial");
    assert((await A.req("/api/akaun/saya")).json?.access?.state === "none", "no access until the trial is started");
    const started = await A.req("/api/akaun/percubaan", { method: "POST", body: {} });
    assert(started.status === 200 && started.json?.ok === true, "the reader starts the trial");
    const inTrial = await A.req(lockedPath);
    assert(inTrial.status === 200 && inTrial.text.includes(locked.canary!.slice(0, 28)), "with the trial the text is shown");
    const searchIn = await A.req(`/cari?q=${encodeURIComponent(locked.canary!.slice(0, 28))}`);
    assert(searchIn.status === 200 && searchIn.text.includes(`href="${lockedPath}"`), "and search looks inside the text again");

    // ------------------------------------------------------------ an open code, no trial
    console.log("\nAn open (shared) code gives access without the trial");
    const B = new Device();
    await signIn(B, "pw-b@pw.invalid");
    const shared = await createSharedCode(db, { grant: { unit: "days", amount: 7 }, maxRedemptions: 5, channel: "paywall-check", createdBy: "paywall-check" });
    const before = await B.req(lockedPath);
    assert(!before.text.includes(locked.canary!.slice(0, 28)), "locked before redeeming");
    const redeemed = await B.req("/api/akaun/tebus", { method: "POST", body: { code: shared.code, batch: "" } });
    assert(redeemed.status === 200 && redeemed.json?.ok === true, "the shared code is redeemed", redeemed.text.slice(0, 200));
    const after = await B.req(lockedPath);
    assert(after.status === 200 && after.text.includes(locked.canary!.slice(0, 28)), "and the text is shown");
    assert((await B.req("/api/akaun/saya")).json?.access?.state === "subscribed", "the reader is shown as subscribed");

    // ------------------------------------------------------------ the trial has been used
    console.log("\nA reader whose trial is gone");
    const C = new Device();
    const emailC = "pw-c@pw.invalid";
    await signIn(C, emailC);
    await C.req("/api/akaun/percubaan", { method: "POST", body: {} });
    await sql`UPDATE reader_accounts SET status = 'deleted' WHERE email_normalized = ${emailC}`.execute(db);
    const C2 = new Device();
    await signIn(C2, emailC);
    const gone = await C2.req(lockedPath);
    assert(gone.status === 200 && !gone.text.includes(locked.canary!.slice(0, 28)) && gone.text.includes("Akses anda belum aktif"), "the address has used its trial: the page asks for a code", gone.status);
    assert((await C2.req("/api/akaun/percubaan", { method: "POST", body: {} })).status === 409, "and a second trial is refused");

    // ------------------------------------------------------------ the switch off again
    console.log("\nPaywall off again");
    await setPaywall(db, false, "paywall-check");
    const reopened = await visitor.req(lockedPath);
    assert(reopened.status === 200 && reopened.text.includes(locked.canary!.slice(0, 28)), "everything is open again for a visitor");
  } finally {
    await setPaywall(db, originalPaywall, "paywall-check");
    for (const slug of touchedSamples) await setSample(db, slug, false, "paywall-check");
    await sql`DELETE FROM shared_codes WHERE channel = 'paywall-check'`.execute(db).catch(() => undefined);
    await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@pw.invalid'`.execute(db).catch(() => undefined);
    await sql`DELETE FROM reader_trial_claims`.execute(db).catch(() => undefined);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  await closeDb();
  if (failed) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
