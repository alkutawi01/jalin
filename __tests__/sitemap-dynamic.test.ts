/**
 * Audit finding: sitemap.xml was prerendered at build time (X-Vercel-Cache: PRERENDER), so a work published after the last deploy was missing
 * from it, and its contributor URLs were a fixed pair that bylines do not link to.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/app/sitemap.ts"), "utf8").replace(/\r\n/g, "\n");
assert(src.includes('export const dynamic = "force-dynamic"'), "the sitemap is read on every request");
assert(src.includes('.selectFrom("contributors").select("slug").where("is_visible", "=", true)'), "contributor pages come from the visible contributors in the database");
assert(src.includes("...contributors.map((slug)") && src.includes("return CONTRIBUTOR_SLUGS;"), "the static pair is only the fallback");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
