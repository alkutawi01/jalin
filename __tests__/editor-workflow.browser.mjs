/**
 * Local, no-production-data editor simulation. Start the app with
 * ADMIN_DEV_BYPASS=true npm run dev -- -p 3100, then run this file.
 * Playwright intercepts admin APIs with in-memory fixtures, so no DB is written.
 */
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.EDITOR_TEST_URL || "http://localhost:3100";
const chrome = process.env.EDITOR_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const id = "JLN-CER-UI-TEST";
const imageSrc = (color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="${color}"/></svg>`)}`;
const file = { name: "ujian.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") };

let work;
let visuals = [];
let glossary = [];
let nextVisualId = 1;
let patches = 0;
let replacements = 0;
const pageErrors = [];
const browser = await chromium.launch({ headless: true, executablePath: chrome });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.on("pageerror", (error) => pageErrors.push(error.message));

await page.route("**/api/admin/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const target = url.pathname;
  const method = request.method();
  const reply = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });

  if (target === "/api/admin/series" && method === "GET") return reply([]);
  if (target === "/api/admin/works/start-draft" && method === "POST") {
    const submitted = request.postDataJSON();
    work = {
      id, title: "Draf tanpa tajuk", slug: "draf-ui-test", type: submitted.type,
      status: "draft", body: "", genre: null,
      audience: "13-17", dek: null,
      reading_minutes: null, version: "v0.1",
      published_at: null, editor_pick: false, editor_pick_rank: null, editor_pick_reason: null,
      updated_at: new Date().toISOString(),
    };
    return reply({ id }, 201);
  }
  if (target === `/api/admin/works/${id}`) {
    if (method === "GET") return reply(work);
    if (method === "PATCH") {
      patches++;
      const data = request.postDataJSON();
      Object.assign(work, data);
      if (data.readingMinutes !== undefined) work.reading_minutes = data.readingMinutes;
      if (data.editorPick !== undefined) work.editor_pick = data.editorPick;
      if (data.editorPickRank !== undefined) work.editor_pick_rank = data.editorPickRank;
      if (data.editorPickReason !== undefined) work.editor_pick_reason = data.editorPickReason;
      return reply(work);
    }
  }
  if (target === `/api/admin/works/${id}/publication-readiness`) {
    const gates = Object.fromEntries(["content", "credits", "visuals", "privacy", "rights", "structure", "workflow"].map((name) => [name, { pass: true, blockers: [], warnings: [] }]));
    return reply({ ready: false, blockers: [], warnings: [], gates, checkedAt: new Date().toISOString() });
  }
  if (target === `/api/admin/works/${id}/source-rights`) return reply({ sourceWork: null, rightsHistory: [], rightsReady: false, rightsBlockers: [] });
  if (target === `/api/admin/works/${id}/sections`) return reply([]);
  if (target === `/api/admin/works/${id}/characters`) return reply([]);
  if (target === "/api/admin/visuals" && method === "GET") return reply(visuals);
  if (target === `/api/admin/works/${id}/visuals/upload` && method === "POST") {
    const body = await new Request(request.url(), { method: "POST", headers: { "content-type": request.headers()["content-type"] }, body: request.postDataBuffer() }).formData();
    const role = String(body.get("role"));
    const visual = { id: nextVisualId++, work_id: id, role, src: imageSrc("#af8265"), alt: String(body.get("alt")), anchor: body.get("anchor") || null, place: "after", sort_order: visuals.length };
    visuals.push(visual);
    return reply({ success: true, visualId: visual.id }, 201);
  }
  const replace = target.match(/^\/api\/admin\/visuals\/(\d+)\/replace$/);
  if (replace && method === "POST") {
    replacements++;
    const index = visuals.findIndex((visual) => visual.id === Number(replace[1]));
    assert.ok(index >= 0);
    visuals[index] = { ...visuals[index], id: nextVisualId++, src: imageSrc("#4d7894") };
    return reply({ success: true, visualId: visuals[index].id });
  }
  const visualRoute = target.match(/^\/api\/admin\/visuals\/(\d+)$/);
  if (visualRoute && method === "PATCH") {
    const visual = visuals.find((item) => item.id === Number(visualRoute[1]));
    Object.assign(visual, request.postDataJSON());
    return reply(visual);
  }
  if (target === "/api/admin/glossary" && method === "GET") return reply(glossary);
  if (target === "/api/admin/glossary" && method === "POST") {
    glossary.push({ id: glossary.length + 1, work_id: id, ...request.postDataJSON() });
    return reply(glossary.at(-1), 201);
  }
  if (target === "/api/admin/credits" || target === "/api/admin/contributors") return reply([]);
  return reply([], 200);
});

try {
  await page.goto(`${base}/admin/works/add`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Cerpen/ }).click();
  await page.waitForURL(`**/admin/works/${id}#content`);
  await page.getByRole("button", { name: "Maklumat", exact: true }).click();
  await page.getByLabel("Genre").fill("Misteri");
  await page.getByRole("button", { name: "Simpan teks & maklumat" }).click();
  assert.equal(work.genre, "Misteri", "Metadata may be saved before a manuscript exists");
  assert.equal(work.body, "", "Saving metadata must not invent manuscript text");
  await page.getByRole("button", { name: "Kandungan", exact: true }).click();
  await page.getByLabel("Tajuk *").fill("Cerpen Ujian Editor");
  await page.getByLabel("Manuskrip (Markdown) *").fill("Minyak hitam naik harga.\n\nAina memandang kereta itu.\n\nMinyak hitam masih diperlukan.");
  await page.getByLabel("Dek").fill("Draf ujian aliran editor.");
  await page.getByRole("button", { name: "Simpan teks & maklumat" }).click();
  await page.getByLabel("Manuskrip (Markdown) *").waitFor();
  assert.equal(work.status, "draft", "New cerpen must remain a draft");

  await page.getByLabel("Tajuk *").fill("Cerpen Ujian Editor Disunting");
  await page.getByRole("button", { name: "Simpan teks & maklumat" }).click();
  assert.equal(work.title, "Cerpen Ujian Editor Disunting");

  await page.getByRole("button", { name: "Maklumat", exact: true }).click();
  await page.getByLabel("Genre").fill("Drama Sosial");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Genre").waitFor();
  assert.equal(await page.getByLabel("Genre").inputValue(), "Misteri", "Unsaved metadata should not be silently persisted");
  await page.getByLabel("Genre").fill("Drama Sosial");
  await page.getByRole("button", { name: "Simpan teks & maklumat" }).click();
  assert.equal(work.genre, "Drama Sosial");

  await page.getByRole("button", { name: /Glosari/ }).click();
  await page.getByRole("button", { name: /Tambah istilah/ }).click();
  await page.getByPlaceholder("Istilah", { exact: true }).fill("minyak hitam");
  await page.getByPlaceholder("Maksud istilah").fill("Minyak untuk enjin kereta.");
  await page.getByRole("button", { name: "Simpan istilah" }).click();
  await page.getByText("minyak hitam", { exact: true }).waitFor();
  assert.equal(glossary.length, 1);

  await page.getByRole("button", { name: "Kandungan", exact: true }).click();
  await page.getByLabel("Teks alternatif * (satu ayat menerangkan gambar untuk pembaca yang tidak nampak gambar)").fill("Kereta di tepi jalan.");
  await page.getByLabel("Fail imej *").setInputFiles(file);
  await page.getByRole("button", { name: "Muat naik & pautkan" }).click();
  await page.getByText("Gambar utama", { exact: true }).last().waitFor();
  assert.equal(visuals[0].role, "hero");
  const patchBeforeReplacement = patches;
  await page.locator(".work-image-card").first().locator('input[type="file"]').setInputFiles(file);
  await page.getByRole("button", { name: "Ya, ganti" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".work-image-card").length === 1);
  assert.equal(replacements, 1, "Replace should call its own API");
  assert.equal(patches, patchBeforeReplacement, "Replace must not require work-level save");

  const manuscript = page.getByLabel("Manuskrip (Markdown) *");
  await manuscript.focus();
  await manuscript.press("Control+Home");
  await page.getByRole("button", { name: "Sisip penanda gambar selepas perenggan ini" }).click();
  assert.match(await manuscript.inputValue(), /\[\[gambar:1\]\]/);
  await page.getByRole("button", { name: "Simpan teks & maklumat" }).click();
  assert.match(work.body, /\[\[gambar:1\]\]/);
  await page.getByLabel("Teks alternatif * (satu ayat menerangkan gambar untuk pembaca yang tidak nampak gambar)").fill("Aina berdiri di sisi kereta.");
  await page.getByLabel("Fail imej *").setInputFiles(file);
  await page.getByLabel("Penanda gambar dalam manuskrip *").selectOption("[[gambar:1]]");
  await page.getByRole("button", { name: "Muat naik & pautkan" }).click();
  await page.getByText("Gambar dalam teks", { exact: true }).last().waitFor();
  assert.equal(visuals.length, 2);
  assert.equal(visuals[1].anchor, "[[gambar:1]]");

  await manuscript.fill("Minyak hitam naik harga.\n\nAina memandang kereta itu.\n\nMinyak hitam masih diperlukan.\n\n[[gambar:1]]");
  await page.getByRole("button", { name: "Simpan teks & maklumat" }).click();
  assert.ok(work.body.endsWith("[[gambar:1]]"), "Moving marker should persist without visual re-upload");
  visuals[1].anchor = "Aina memandang kereta itu.";
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".work-image-card").last().getByRole("button", { name: "Ubah butiran" }).click();
  await page.getByLabel("Penanda dalam manuskrip").selectOption("[[gambar:1]]");
  await page.getByRole("button", { name: "Simpan butiran" }).click();
  assert.equal(visuals[1].anchor, "[[gambar:1]]", "Existing text anchors should be migratable without re-upload");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(os.tmpdir(), "jalin-editor-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Manuskrip (Markdown) *").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false, "Mobile editor should not overflow horizontally");
  await page.screenshot({ path: path.join(os.tmpdir(), "jalin-editor-mobile.png"), fullPage: true });
  assert.deepEqual(pageErrors, [], "Browser should have no uncaught page errors");
  console.log(JSON.stringify({ result: "PASS", createdDraft: work.id, workPatches: patches, imageUploads: 2, replacements, glossaryTerms: glossary.length, mobileOverflow: overflow, screenshots: [path.join(os.tmpdir(), "jalin-editor-desktop.png"), path.join(os.tmpdir(), "jalin-editor-mobile.png")] }));
} finally {
  await browser.close();
}
