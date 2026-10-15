import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  const page = await browser.newPage();
  const requests = [];
  await page.route("**/api/admin/works/import", async route => {
    const body = route.request().postDataJSON();
    requests.push(body);
    assert.equal(body.dryRun, true, "this simulation never creates data");
    const second = body.answer.includes("Kedua");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, errors: [], warnings: [], plan: {
      work: { title: second ? "Kedua" : "Pertama", slug: second ? "kedua" : "pertama", type: "cerpen", genre: "Misteri", dek: "Dek ujian", readingMinutes: 1 },
      stats: { storedWords: 20, sectionCount: 0 }, credits: [{ guestName: second ? "Penulis Kedua" : "Penulis Pertama", byline: true, roleLabel: "initial_draft" }], characters: [], glossary: [], sections: [], visuals: [], source: null, series: null
    } }) });
  });
  await page.goto((process.env.EDITOR_TEST_URL || "http://localhost:3103") + "/admin/works/add/cerpen", { waitUntil: "networkidle" });
  await page.getByPlaceholder("Tampal teks karya di sini…").fill("Teks ujian sahaja.");
  await page.getByText("Tampal tidak berfungsi? Tampal secara manual", { exact: true }).click();
  const answer = page.getByPlaceholder("Tampal jawapan bot sembang di sini…");
  await answer.fill("[KARYA]\nTajuk: Pertama");
  await page.getByRole("button", { name: "Semak", exact: true }).click();
  await page.locator("#f-writer").waitFor();
  assert.equal(await page.locator("#f-writer").inputValue(), "Penulis Pertama");
  await page.locator("#f-writer").fill("Nama lama yang disunting");
  await answer.fill("[KARYA]\nTajuk: Kedua");
  assert.equal(await page.getByRole("button", { name: "Simpan draf", exact: true }).count(), 0, "changing answer invalidates old save plan");
  await page.getByRole("button", { name: "Semak", exact: true }).click();
  await page.locator("#f-writer").waitFor();
  assert.equal(await page.locator("#f-writer").inputValue(), "Penulis Kedua");
  assert.equal(requests[1].writerName, undefined, "old writer cannot leak into the new request");
  assert.deepEqual(requests[1].overrides, {}, "old title/dek/genre cannot leak through React state closure");
  console.log("Fresh answer: manual paste, old-plan invalidation, writer reset and clean metadata request passed");
} finally { await browser.close(); }
