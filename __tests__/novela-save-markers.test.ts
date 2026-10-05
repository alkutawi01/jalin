/**
 * Audit finding: PATCH /api/admin/works/[id] refused to save a Novela's details (400 "Penanda ... masih digunakan oleh gambar") as soon as
 * one chapter had an inline picture, because it looked for that picture's marker in the work's own (empty) body. A chapter's picture has
 * its marker in the chapter text, so the check only covers the work's own pictures (no section_slug).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/works/[id]/route.ts"), "utf8").replace(/\r\n/g, "\n");
assert(src.includes('.where("work_id", "=", id).where("section_slug", "is", null).select("anchor")'), "only pictures without a chapter are checked against the work's body");
assert(src.includes("masih digunakan oleh gambar"), "a work's own picture still cannot lose its marker");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
