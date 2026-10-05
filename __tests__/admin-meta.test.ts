/**
 * Audit finding: /admin/login had the title "Jalin · Pentadbiran · Jalin" (the site template adds " · Jalin") and no noindex, relying on
 * robots.txt alone, which does not keep a page out of search results if something links to it.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const layout = fs.readFileSync(path.join(__dirname, "../src/app/admin/layout.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(layout.includes('title: "Pentadbiran",') && !layout.includes('title: "Jalin · Pentadbiran"'), "the title is 'Pentadbiran'; the template makes it 'Pentadbiran · Jalin'");
assert(layout.includes("robots: { index: false, follow: false }"), "every admin page says noindex, nofollow");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
