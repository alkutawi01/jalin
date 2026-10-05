/**
 * A work that has been public keeps its address: public pages read the published snapshot, so changing the slug in the editor would turn the
 * old (shared, indexed) URL into a 404 at the next "Terbitkan semula".
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/works/[id]/route.ts"), "utf8").replace(/\r\n/g, "\n");
const guard = route.indexOf("body.slug !== existing.slug");
assert(guard > 0 && route.slice(guard, guard + 260).includes("published_revision_id") && route.slice(guard, guard + 400).includes("status: 400"), "the API refuses a new slug on a work that has been published");
assert(guard < route.indexOf("await updateWork(id"), "and does so before writing");
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes("readOnly={everPublic}") && page.includes("slug-locked") && page.includes("setEverPublic(Boolean(work.published_at"), "the editor shows the address as locked, with the reason");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
