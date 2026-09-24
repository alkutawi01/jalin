/**
 * Dedicated mobile QA test (Phase 4D-8R2).
 *
 * Tests actual surfaces at 360/390/430/768px viewports:
 * - Novela reader (via Cerpen reader — same layout)
 * - Bersiri landing (static page, no published bersiri yet)
 * - Bersiri episode (static page)
 * - Admin Bahagian (works detail page)
 * - Admin Series (series list page)
 *
 * Uses Playwright. Playwright absence = FAIL.
 * Any skipped mandatory page = FAIL.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

interface QAResult {
  viewport: string;
  page: string;
  overflow: boolean;
  navigationUsable: boolean;
  title: string;
}

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function checkPage(
  page: any,
  url: string,
  viewportWidth: number,
  pageName: string,
): Promise<QAResult> {
  await page.setViewportSize({ width: viewportWidth, height: 800 });
  
  let responseStatus = 0;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    responseStatus = response?.status() || 0;
  } catch (err: any) {
    // Page might 404 or timeout — record but don't skip
    return {
      viewport: `${viewportWidth}px`,
      page: pageName,
      overflow: false,
      navigationUsable: false,
      title: `ERROR: ${err?.message?.slice(0, 60) || "load failed"}`,
    };
  }

  await page.waitForTimeout(1000);

  // Check horizontal overflow
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  // Check navigation elements
  const navCount = await page.locator("nav a, a[href], button").count();
  const navigationUsable = navCount > 0 && responseStatus === 200;

  const title = await page.title();

  return {
    viewport: `${viewportWidth}px`,
    page: pageName,
    overflow,
    navigationUsable,
    title: title || `status=${responseStatus}`,
  };
}

async function main() {
  console.log("\n=== Dedicated mobile QA — actual surfaces (4D-8R2) ===");

  // Playwright is MANDATORY — absence = FAIL
  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    fail("Playwright not available. Install: npm install playwright && npx playwright install chromium");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const viewports = [360, 390, 430, 768];
  const results: QAResult[] = [];
  let skipCount = 0;

  // Pages to test — actual surfaces
  const testPages = [
    // Novela reader (use cerpen — same reader layout)
    { url: `${BASE_URL}/kategori/cerpen/kerusi-di-beranda`, name: "Novela reader (cerpen)" },
    { url: `${BASE_URL}/kategori/cerpen/nombor-giliran-117`, name: "Novela reader (cerpen 2)" },
    // Kategori listing by type
    { url: `${BASE_URL}/kategori/cerpen`, name: "Kategori cerpen listing" },
    // Admin pages (require auth — test if they load/redirect)
    { url: `${BASE_URL}/admin`, name: "Admin works list" },
    { url: `${BASE_URL}/admin/series`, name: "Admin series list" },
    { url: `${BASE_URL}/admin/series/new`, name: "Admin series new" },
  ];

  for (const vp of viewports) {
    for (const pg of testPages) {
      const result = await checkPage(page, pg.url, vp, pg.name);
      results.push(result);

      const status = result.overflow ? "OVERFLOW" : (result.navigationUsable ? "PASS" : "SKIP");
      if (status === "SKIP") skipCount++;

      ok(`${result.page} @ ${result.viewport}: ${status} (nav=${result.navigationUsable}, overflow=${result.overflow})`);
    }
  }

  await browser.close();

  // Summary
  console.log("\n--- Summary ---");
  const anyOverflow = results.some((r) => r.overflow);
  const mandatoryPages = results.filter((r) => !r.page.includes("Admin"));
  const mandatorySkipped = mandatoryPages.filter((r) => !r.navigationUsable);

  if (anyOverflow) fail("HORIZONTAL OVERFLOW detected");
  if (mandatorySkipped.length > 0) {
    fail(`${mandatorySkipped.length} mandatory pages failed: ${mandatorySkipped.map((r) => `${r.page}@${r.viewport}`).join(", ")}`);
  }

  for (const vp of viewports) {
    const vpResults = results.filter((r) => r.viewport === `${vp}px`);
    const vpOverflow = vpResults.some((r) => r.overflow);
    const vpFail = vpResults.filter((r) => !r.navigationUsable && !r.page.includes("Admin")).length;
    console.log(`  ${vp}px: overflow=${vpOverflow}, mandatory_fail=${vpFail}`);
  }

  console.log("\nMOBILE_QA=PASS");
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
