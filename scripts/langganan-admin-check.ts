/**
 * The admin Langganan routes and pages, against a RUNNING dev server (the admin is open on localhost by ADMIN_DEV_BYPASS):
 * making a batch, tracking its cards, cancelling and replacing, the members list and its CSV, the samples and the paywall switch.
 * Local work only reaches the development database (src/lib/db/env.ts). It cleans up the batch it makes.
 *
 *   NEXT_DIST_DIR=.next-test npx next dev -p 3100 > dev.log
 *   READER_E2E_BASE=http://localhost:3100 npx tsx scripts/langganan-admin-check.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";

const BASE = process.env.READER_E2E_BASE ?? "http://localhost:3100";
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

async function call(path: string, init: { method?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { origin: BASE };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(BASE + path, { method: init.method ?? "GET", headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined, redirect: "manual" });
  const buf = Buffer.from(await res.arrayBuffer());
  let json: any = null;
  if ((res.headers.get("content-type") ?? "").includes("json")) { try { json = JSON.parse(buf.toString("utf8")); } catch { /* not json */ } }
  return { status: res.status, headers: res.headers, buf, text: buf.toString("utf8"), json };
}

async function main() {
  const db = getDb();
  let batchId: string | null = null;
  try {
    console.log("\nMaking a batch");
    const made = await call("/api/admin/langganan/batch", { method: "POST", body: { months: 1, quantity: 3, batchNumber: "HTTP-001", note: "ujian http" } });
    assert(made.status === 200 && (made.headers.get("content-type") ?? "").includes("application/pdf") && made.buf.subarray(0, 4).toString() === "%PDF", "the batch answers with the label PDF", made.status);
    batchId = made.headers.get("x-batch-id");
    assert(!!batchId && made.headers.get("x-cards") === "3", "and says which batch and how many cards");
    if (!batchId) throw new Error("no batch id");

    console.log("\nTracking the cards");
    const info = await call(`/api/admin/langganan/batch/${batchId}`);
    assert(info.status === 200 && info.json.batch.counts.total === 3 && info.json.batch.counts.generated === 3 && info.json.codes.total === 3, "the batch and its three cards are listed", info.text.slice(0, 200));
    assert(!/[0-9A-HJKMNP-TV-Z]{16}/.test(JSON.stringify(info.json.codes.rows.map((r: { serial: string }) => r.serial)).replace(/JLN-\d\d-\d{6}/g, "")), "no plain code appears in the list");
    const confirm = await call(`/api/admin/langganan/batch/${batchId}`, { method: "POST", body: { action: "confirm" } });
    const issue = await call(`/api/admin/langganan/batch/${batchId}`, { method: "POST", body: { action: "issue" } });
    assert(confirm.status === 200 && issue.status === 200 && issue.json.issued === 3, "the print is confirmed and the cards switched on");
    const after = await call(`/api/admin/langganan/batch/${batchId}?tapis=unredeemed`);
    assert(after.json.codes.total === 3 && after.json.codes.rows.every((r: { state: string }) => r.state === "issued"), "three cards are switched on and not redeemed");
    const bad = await call(`/api/admin/langganan/batch/${batchId}?tapis=bukan-penapis&halaman=-3&q=%25%25`);
    assert(bad.status === 200 && bad.json.codes.page === 1 && bad.json.codes.total === 0, "an odd filter, page or search is answered, not an error");
    const serials: string[] = after.json.codes.rows.map((r: { serial: string }) => r.serial);

    console.log("\nCancelling and replacing");
    const noReason = await call(`/api/admin/langganan/batch/${batchId}`, { method: "POST", body: { action: "revoke_codes", serials: [serials[0]], reason: "" } });
    assert(noReason.status === 400, "cancelling needs a reason");
    const revoke = await call(`/api/admin/langganan/batch/${batchId}`, { method: "POST", body: { action: "revoke_codes", serials: [serials[0], "JLN-26-000000"], reason: "ujian batal" } });
    assert(revoke.status === 200 && revoke.json.revoked === 1 && revoke.json.skipped.length === 1, "one card is cancelled and an unknown serial is skipped", revoke.text);
    const replace = await call(`/api/admin/langganan/kod/${serials[1]}`, { method: "POST", body: { action: "replace", reason: "ujian ganti" } });
    assert(replace.status === 200 && (replace.headers.get("content-type") ?? "").includes("application/pdf") && !!replace.headers.get("x-new-serial") && replace.headers.get("x-old-serial") === serials[1], "replacing answers with the new label and the new serial number", replace.status);
    const again = await call(`/api/admin/langganan/kod/${serials[1]}`, { method: "POST", body: { action: "replace", reason: "sekali lagi" } });
    assert(again.status !== 200, "a card that was replaced cannot be replaced again", again.status);
    const final = await call(`/api/admin/langganan/batch/${batchId}`);
    assert(final.json.batch.counts.total === 4 && final.json.batch.counts.revoked === 2 && final.json.batch.counts.issued === 2, "the batch now has four cards: two cancelled, two switched on");

    console.log("\nThe members and the samples");
    const members = await call("/api/admin/langganan/ahli?status=semua");
    assert(members.status === 200 && Array.isArray(members.json.rows) && typeof members.json.counts.semua === "number", "the members list answers with counts");
    const odd = await call("/api/admin/langganan/ahli?status=<script>&halaman=abc&q=%00");
    assert(odd.status === 200, "an odd status or page is answered, not an error");
    const csv = await call("/api/admin/langganan/ahli/csv");
    assert(csv.status === 200 && (csv.headers.get("content-type") ?? "").includes("text/csv") && csv.text.startsWith("﻿\"E-mel\""), "the CSV has its heading row", csv.text.slice(0, 40));
    const samples = await call("/api/admin/langganan/contoh");
    assert(samples.status === 200 && Array.isArray(samples.json.works), "the works are listed for choosing samples");
    const noSuch = await call("/api/admin/langganan/contoh", { method: "POST", body: { slug: "tiada-cerita-ini", sample: true } });
    assert(noSuch.status === 404, "a work that is not published cannot be made a sample");
    const paywall = await call("/api/admin/langganan/dinding-bayar");
    assert(paywall.status === 200 && typeof paywall.json.on === "boolean", "the paywall switch can be read");

    console.log("\nThe pages");
    for (const [path, needle] of [[`/admin/langganan/kad/${batchId}`, "HTTP-001"], ["/admin/langganan/pembaca", "Semua ahli"], ["/admin/langganan/contoh", "Cerita contoh"], ["/admin/langganan", "Dinding bayar"], ["/admin/langganan/kad", "Kad dan kelompok"]] as const) {
      const page = await call(path);
      assert(page.status === 200 && page.text.includes(needle), `${path} opens and shows "${needle}"`, page.status);
    }
    assert((await call("/admin/langganan/kad/bukan-id")).status === 404, "an invalid batch address is a 404");
    assert((await call("/admin/langganan/kad/00000000-0000-0000-0000-000000000000")).status === 404, "a batch that does not exist is a 404");
  } finally {
    if (batchId) {
      await sql`DELETE FROM redeem_codes WHERE batch_id = ${batchId}`.execute(db).catch(() => undefined);
      await sql`DELETE FROM code_batches WHERE id = ${batchId}`.execute(db).catch(() => undefined);
    }
    await sql`DELETE FROM reader_switches WHERE key = 'sample:tiada-cerita-ini'`.execute(db).catch(() => undefined);
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
