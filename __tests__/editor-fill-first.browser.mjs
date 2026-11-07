/** Local component QA with mocked HTTP APIs. Persistence itself is tested in editor-fill-first.integration.ts. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const bundle = await build({ stdin: { contents: `
  import React from 'react'; import { createRoot } from 'react-dom/client';
  import EditorAssistant from './src/components/admin/EditorAssistant';
  import PlacesEditor from './src/components/admin/PlacesEditor';
  window.applied = 0; window.prepared = 0; window.allowSave = true;
  createRoot(document.getElementById('root')).render(<main className="admin-main">
    <EditorAssistant workId="fixture" scope="all" context={{type:'cerpen',title:'Ujian',body:'Tanggam pada kayu.'}} blocked={false}
      beforeApply={async()=>{window.prepared++; return window.allowSave;}} onApplied={()=>window.applied++}/>
    <PlacesEditor workId="fixture"/>
  </main>);
`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const js = bundle.outputFiles[0].text;
const css = readFileSync("src/app/admin/admin.css", "utf8");
const description = "Keterangan penuh latar untuk disunting selepas simpan. ".repeat(9).trim();
let review = null;
let places = [{ name: "Tempat ujian", description }];
let writes = 0;
const server = createServer(async (req, res) => {
  const reply = data => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(js); }
  if (req.url === "/admin.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url === "/api/admin/audience-bands") return reply({});
  if (req.url === "/api/admin/works/fixture/assistant-fill") {
    if (req.method === "GET") return reply({ reviews: review ? { all: review } : {}, versions: review ? { all: createHash("sha256").update(JSON.stringify(review)).digest("hex") } : {} });
    let text = ""; for await (const chunk of req) text += chunk;
    const input = JSON.parse(text); writes++;
    review = input.action === "resolve" ? null : { text: input.text, issues: ["Keterangan panjang sudah disimpan penuh. Betulkan sebelum terbit."] };
    return reply({ notes: ["Isian disimpan."] });
  }
  if (req.url === "/api/admin/works/fixture/places") {
    if (req.method === "PATCH") { let text = ""; for await (const chunk of req) text += chunk; places = JSON.parse(text).places; }
    return reply(places);
  }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html lang="ms"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/admin.css"><body class="admin-body"><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDITOR_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { readText: async () => { throw Error("Manual test"); } } }));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);
  await page.getByText("Bantuan AI master — semua tab", { exact: true }).click();
  await page.getByRole("button", { name: "2. Tampal jawapan", exact: true }).click();
  const input = page.getByLabel("Tampal jawapan secara manual");
  const answer = `[LATAR]\nJenis: tempat\nNama: Tempat ujian\nKeterangan: ${description}`;
  await input.fill(answer);
  await page.getByRole("button", { name: "Isi daripada jawapan", exact: true }).click();
  await page.waitForFunction(() => window.applied === 1);
  assert.equal(writes, 1); assert.equal(await page.evaluate(() => window.prepared), 1, "current manuscript is saved before applying/reloading");
  assert.equal(review.text, answer);
  await page.reload();
  await page.getByText("Bantuan AI master — semua tab", { exact: true }).click();
  await input.waitFor();
  assert.equal(await input.inputValue(), answer, "saved answer survives reload and is editable");
  await input.fill("[KARYA]\nTajuk: Tajuk dibetulkan");
  await page.getByRole("button", { name: "Isi daripada jawapan", exact: true }).click();
  await page.waitForFunction(() => window.applied === 1);
  assert.match(review.text, /Tajuk dibetulkan/);
  await page.getByRole("button", { name: "Sudah dibetulkan dalam borang", exact: true }).click();
  await page.waitForFunction(() => window.applied === 2);
  assert.equal(review, null);
  const field = page.getByRole("textbox", { name: "Keterangan latar tempat 1", exact: true });
  const longer = description + " Tambahan editor yang juga mesti disimpan.";
  await field.fill(longer);
  await page.getByRole("button", { name: "Simpan latar tempat", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Latar Tempat disimpan." }).waitFor();
  assert.equal(places[0].description, longer, "manual correction saves the full value too");
  await page.evaluate(() => { window.allowSave = false; });
  const before = writes;
  await page.getByRole("button", { name: "Isi daripada jawapan", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Teks semasa belum dapat disimpan" }).waitFor();
  assert.equal(writes, before, "an unsaved manuscript is never discarded on a failed prerequisite save");
  for (const width of [375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no page overflow at ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log("PASS: mobile/desktop draft correction, reload recovery, full-text manual save, manuscript-save guard and console checks (mock APIs).");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
