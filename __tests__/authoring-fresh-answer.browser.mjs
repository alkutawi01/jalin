import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requests = [];
  await page.route("**/api/admin/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const reply = data => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
    if (path.endsWith("/assistant-fill")) {
      const data = route.request().postDataJSON(); requests.push(data);
      assert.equal(data.action, "preview", "this test writes nothing");
      const second = data.text.includes("Kedua");
      return reply({ version: second ? "v2" : "v1", notes: ["Belum disimpan."], changes: [{ id: "content:title", group: "content", key: "title", label: "Tajuk", before: "Lama", after: second ? "Kedua" : "Pertama", selected: false }] });
    }
    if (path === "/api/admin/works/TEST-FRESH") return reply({ id: "TEST-FRESH", title: "Lama", slug: "lama", type: "cerpen", status: "draft", body: "Aina pulang.", updated_at: new Date().toISOString(), metadata: {}, reader: {} });
    if (path.endsWith("/publication-readiness")) return reply({ ready: false, blockers: [], warnings: [], gates: Object.fromEntries(["content", "credits", "visuals", "privacy", "rights", "structure", "workflow"].map(k => [k, { pass: false, blockers: [], warnings: [] }])) });
    if (path.endsWith("/source-rights")) return reply({ sourceWork: null, rightsHistory: [], rightsBlockers: [] });
    return reply([]);
  });
  await page.goto((process.env.EDITOR_TEST_URL || "http://localhost:3104") + "/admin/works/TEST-FRESH", { waitUntil: "networkidle" });
  const master = page.locator('[data-editor-assistant="all"]');
  await master.locator("summary").first().click();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copied = text; } } }));
  await master.getByRole("button", { name: "1. Salin arahan", exact: true }).click();
  assert.match(await page.evaluate(() => window.__copied), /BOLEH MENGISI BORANG/);
  assert.doesNotMatch(await page.evaluate(() => window.__copied), /dipindahkan secara manual/);
  const answer = master.getByLabel("Jawapan AI — boleh tampal secara manual");
  await answer.fill('{"work":{"title":"Pertama"}}');
  await master.getByRole("button", { name: "Semak jawapan", exact: true }).click();
  await master.getByRole("checkbox").check();
  assert.equal(await master.getByRole("button", { name: "Sahkan & isi (1)" }).isEnabled(), true);
  await answer.fill('{"work":{"title":"Kedua"}}');
  assert.equal(await master.getByRole("button", { name: /Sahkan & isi/ }).count(), 0, "changed answer invalidates old confirmation");
  await master.getByRole("button", { name: "Semak jawapan", exact: true }).click();
  await master.getByRole("button", { name: "Sahkan & isi (0)" }).waitFor();
  assert.equal(await master.getByRole("checkbox").isChecked(), false, "old selection cannot leak");
  assert.equal(requests[1].text, '{"work":{"title":"Kedua"}}');
  await master.getByText("Lihat nilai lama dan baharu").click();
  await master.getByText("Kedua", { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await master.screenshot({ path: "C:/Users/alkut/AppData/Local/Temp/jalin-master-preview-phone.png" });
  console.log("Master: copied structured prompt, manual paste, changed-answer invalidation, selection reset, old/new preview and phone fit passed");
} finally { await browser.close(); }
