import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AdminWorksTable from "../src/components/admin/AdminWorksTable";

async function main() {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const page = await browser.newPage();
    const works = ["Pelangi Petang", "Lima Minit Sebelum Pukul Lima"].map((title, i) => ({ id: `test-${i}`, title, slug: `test-${i}`, type: "cerpen", status: "published", version: "v1.0", authors: "Rafiq Naim", updatedAt: null }));
    const markup = renderToStaticMarkup(<div className="a-shell"><AdminWorksTable works={works} initialPicks={[]} /></div>);
    const css = ["src/app/globals.css", "src/app/admin/admin.css"].map(file => readFileSync(file, "utf8")).join("\n");
    await page.setContent(`<html><head><style>${css}\n.a-shell { display:block; padding:24px; }</style></head><body>${markup}</body></html>`);
    for (const width of [1360, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await page.locator('.admin-selection-cell input[type="checkbox"]').all();
      assert.equal(boxes.length, 2);
      if (width > 600) {
        const header = await page.locator('thead th:first-child input').boundingBox();
        assert(header);
        for (const box of boxes) {
          const rect = await box.boundingBox();
          assert(rect);
          assert(Math.abs((rect.x + rect.width / 2) - (header.x + header.width / 2)) < 1, `checkbox column aligned at ${width}`);
        }
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow at ${width}`);
      console.log(`${width}px: selection checkboxes aligned, no horizontal overflow`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
