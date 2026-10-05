/**
 * Audit finding: og:image, twitter:image and the structured data pointed at the original 4 to 9 MB PNG of each hero; two sinopsis were above
 * Facebook's 8 MB and X's 5 MB limits. They now use the optimiser at 1200px (a width and quality next.config.mjs allows).
 */
import fs from "node:fs";
import path from "node:path";
import { shareImageUrl, SITE_URL } from "../src/lib/seo";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(shareImageUrl("/visuals/a/hero.png") === `${SITE_URL}/_next/image?url=%2Fvisuals%2Fa%2Fhero.png&w=1200&q=75`, "a local picture goes through the optimiser at 1200px, quality 75");
assert(shareImageUrl("https://x.public.blob.vercel-storage.com/a b.png").includes("url=https%3A%2F%2Fx.public.blob.vercel-storage.com%2Fa%20b.png"), "a Blob picture is encoded into the same address");
assert(read("next.config.mjs").includes("qualities: [75, 85]"), "quality 75 is allowed by the optimiser");
for (const f of ["src/app/kategori/[type]/[slug]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx", "src/lib/seo-jsonld.ts"]) {
  assert(read(f).includes("shareImageUrl(") && !/absoluteUrl\((?:hero|series\.hero|work\.hero|series\.hero)[\w.]*src\)|absoluteUrl\((?:work|series)\.heroSrc\)/.test(read(f)), `${f} shares the optimised picture`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
