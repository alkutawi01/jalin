/**
 * Dedicated mobile QA test — actual PUBLIC routes (Phase 4D-8R4).
 *
 * Tests 5 actual surfaces × 4 viewports = 20 minimum checks.
 * All routes are actual public routes (not admin preview substitutes).
 *
 * 1. /kategori/novela/[slug] — actual public Novela reader
 * 2. /kategori/bersiri/[seriesSlug] — actual public Series landing
 * 3. /kategori/bersiri/[seriesSlug]/[episodeSlug] — actual public episode
 * 4. /admin/works/[id] — admin Bahagian
 * 5. /admin/series/[id] — admin Series detail
 *
 * Playwright is MANDATORY. Any skipped mandatory page = FAIL.
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
  navUsable: boolean;
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
  vp: number,
  name: string,
): Promise<QAResult> {
  await page.setViewportSize({ width: vp, height: 800 });
  let status = 0;
  try {
    const r = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    status = r?.status() || 0;
  } catch {
    return { viewport: `${vp}px`, surface: name, overflow: false, navUsable: false };
  }
  await page.waitForTimeout(1000);

  const overflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    if (sw > vw) return true;
    const violations: string[] = [];
    document.querySelectorAll("nav, main, article, table, .prose, [class*='reader']").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 || r.left < -2) violations.push(el.tagName);
    });
    return violations.length > 0;
  });

  const navCount = await page.locator("nav a, a[href], button").count();
  const navUsable = navCount > 0 && status === 200;

  return { viewport: `${vp}px`, surface: name, overflow, navUsable };
}

async function main() {
  console.log("\n=== Mobile QA — actual PUBLIC routes (4D-8R4) ===");

  try { await import("playwright"); } catch {
    fail("Playwright not available");
  }

  const fixtures = await setupFixtures();
  if (!fixtures) fail("Database not available");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const vps = [360, 390, 430, 768];
  const results: QAResult[] = [];

  // Actual PUBLIC routes
  const surfaces = [
    { url: `${BASE_URL}/kategori/novela/${fixtures.novSlug}`, name: "Public Novela reader" },
    { url: `${BASE_URL}/kategori/bersiri/${fixtures.seriesSlug}`, name: "Public Series landing" },
    { url: `${BASE_URL}/kategori/bersiri/${fixtures.seriesSlug}/${fixtures.epSlug}`, name: "Public Bersiri episode" },
    { url: `${BASE_URL}/admin/works/${fixtures.novId}`, name: "Admin Bahagian" },
    { url: `${BASE_URL}/admin/series/${fixtures.seriesId}`, name: "Admin Series detail" },
  ];

  for (const s of surfaces) {
    for (const vp of vps) {
      const r = await checkSurface(page, s.url, vp, s.name);
      results.push(r);
      ok(`${r.surface} @ ${r.viewport}: ${r.overflow ? "OVERFLOW" : (r.navUsable ? "PASS" : "FAIL")}`);
    }
  }

  await browser.close();
  await cleanupFixtures();

  console.log("\n--- Summary ---");
  for (const vp of vps) {
    const vr = results.filter(r => r.viewport === `${vp}px`);
    console.log(`  ${vp}px: overflow=${vr.some(r => r.overflow)}, nav_fail=${vr.filter(r => !r.navUsable).length}`);
  }
  console.log(`  Total: ${results.length} checks, skips: ${results.filter(r => !r.navUsable).length}`);

  if (results.some(r => r.overflow)) fail("HORIZONTAL OVERFLOW");
  if (results.some(r => !r.navUsable)) fail("MANDATORY PAGE FAILED");

  console.log("\nMOBILE_QA=PASS");
  process.exit(0);
}

main().catch(async (err) => { console.error(err); try { await cleanupFixtures(); } catch {} process.exit(1); });
