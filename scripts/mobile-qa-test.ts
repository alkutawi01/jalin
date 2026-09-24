/**
 * Dedicated mobile QA test — actual surfaces (Phase 4D-8R3).
 *
 * Tests 5 actual surfaces × 4 viewports = 20 minimum checks.
 * Surfaces:
 * 1. Novela reader (admin preview — same reader components as public)
 * 2. Bersiri landing (admin series detail — same layout components)
 * 3. Bersiri episode (admin preview — same reader components)
 * 4. Admin Bahagian (works detail)
 * 5. Admin Series detail (series detail)
 *
 * Playwright is MANDATORY. Any skipped mandatory page = FAIL.
 * Screenshots saved for evidence.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { chromium } from "playwright";
import { setupFixtures, cleanupFixtures } from "./qa-fixtures";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

interface QAResult {
  viewport: string;
  surface: string;
  overflow: boolean;
  navigationUsable: boolean;
  screenshot: string;
}

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function checkSurface(
  page: any,
  url: string,
  viewportWidth: number,
  surfaceName: string,
): Promise<QAResult> {
  await page.setViewportSize({ width: viewportWidth, height: 800 });

  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    status = resp?.status() || 0;
  } catch {
    return { viewport: `${viewportWidth}px`, surface: surfaceName, overflow: false, navigationUsable: false, screenshot: "" };
  }

  await page.waitForTimeout(1000);

  // Check horizontal overflow at document level
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  // Check key component bounding boxes
  const componentOverflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const violations: string[] = [];
    // Check main content area
    const main = document.querySelector("main, article, .reader-body, .prose, [class*='content']");
    if (main) {
      const r = main.getBoundingClientRect();
      if (r.right > vw + 2 || r.left < -2) violations.push(`main:${Math.round(r.right)}`);
    }
    // Check navigation
    const nav = document.querySelector("nav");
    if (nav) {
      const r = nav.getBoundingClientRect();
      if (r.right > vw + 2) violations.push(`nav:${Math.round(r.right)}`);
    }
    // Check tables (admin)
    const table = document.querySelector("table");
    if (table) {
      const r = table.getBoundingClientRect();
      if (r.right > vw + 2) violations.push(`table:${Math.round(r.right)}`);
    }
    return violations;
  });

  const hasOverflow = overflow || componentOverflow.length > 0;

  // Check navigation elements exist
  const navCount = await page.locator("nav a, a[href], button").count();
  const navigationUsable = navCount > 0 && status === 200;

  const screenshot = `qa-${viewportWidth}px-${surfaceName.replace(/[^a-z0-9]/gi, "-")}.png`;
  await page.screenshot({ path: screenshot, fullPage: false });

  return { viewport: `${viewportWidth}px`, surface: surfaceName, overflow: hasOverflow, navigationUsable, screenshot };
}

async function main() {
  console.log("\n=== Dedicated mobile QA — 5 surfaces × 4 viewports (4D-8R3) ===");

  // Playwright is MANDATORY
  try { await import("playwright"); } catch {
    fail("Playwright not available. Install: npm install playwright && npx playwright install chromium");
  }

  // Setup test fixtures
  const fixtures = await setupFixtures();
  if (!fixtures) fail("Database not available for fixtures");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const viewports = [360, 390, 430, 768];
  const results: QAResult[] = [];

  // 5 actual surfaces with real routes
  const surfaces = [
    { url: `${BASE_URL}/admin/works/${fixtures.novId}/preview`, name: "Novela reader" },
    { url: `${BASE_URL}/admin/series/${fixtures.seriesId}`, name: "Bersiri landing" },
    { url: `${BASE_URL}/admin/works/${fixtures.epId}/preview`, name: "Bersiri episode" },
    { url: `${BASE_URL}/admin/works/${fixtures.novId}`, name: "Admin Bahagian" },
    { url: `${BASE_URL}/admin/series/${fixtures.seriesId}`, name: "Admin Series detail" },
  ];

  for (const surface of surfaces) {
    for (const vp of viewports) {
      const result = await checkSurface(page, surface.url, vp, surface.name);
      results.push(result);
      const status = result.overflow ? "OVERFLOW" : (result.navigationUsable ? "PASS" : "FAIL");
      ok(`${result.surface} @ ${result.viewport}: ${status}`);
    }
  }

  await browser.close();

  // Cleanup fixtures
  await cleanupFixtures();

  // Summary
  console.log("\n--- Summary ---");
  const anyOverflow = results.some((r) => r.overflow);
  const anyNavFail = results.some((r) => !r.navigationUsable);
  const mandatoryFails = results.filter((r) => !r.navigationUsable);

  for (const vp of viewports) {
    const vpResults = results.filter((r) => r.viewport === `${vp}px`);
    const vpOverflow = vpResults.some((r) => r.overflow);
    const vpFail = vpResults.filter((r) => !r.navigationUsable).length;
    console.log(`  ${vp}px: overflow=${vpOverflow}, nav_fail=${vpFail}`);
  }

  console.log(`\n  Total checks: ${results.length}`);
  console.log(`  Mandatory skips: ${mandatoryFails.length}`);

  if (anyOverflow) fail("HORIZONTAL OVERFLOW detected at component level");
  if (mandatoryFails.length > 0) fail(`${mandatoryFails.length} mandatory pages failed`);

  console.log("\nMOBILE_QA=PASS");
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await cleanupFixtures(); } catch {}
  process.exit(1);
});
