import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("https://jalin.adjung.com/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: readFileSync("src/app/globals.css", "utf8") });
  for (const width of [1440, 1050, 900, 768, 680, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const rects = await page.locator(".category-explorer-card").evaluateAll(cards => cards.map(card => {
      const r = card.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right };
    }));
    assert.equal(rects.length, 5);
    const [first, , , fourth, last] = rects;
    if (width > 1050) assert(Math.abs(last.width - first.width) < 1);
    else if (width > 360) {
      assert(last.width > first.width * 1.9, `only Sinopsis spans two columns at ${width}`);
      assert(Math.abs(last.right - (await page.locator(".category-explorer-grid").boundingBox()).x - (await page.locator(".category-explorer-grid").boundingBox()).width) < 1);
      if (width > 680) assert(Math.abs(last.y - fourth.y) < 1);
    } else assert(Math.abs(last.width - first.width) < 1);
    assert(Math.abs(last.height - first.height) < 1, `same card height at ${width}`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no page overflow at ${width}`);
    console.log(`${width}px: category span, height and overflow passed`);
  }
} finally { await browser.close(); }
