/**
 * One confirmed answer is one atomic server request; late failures cannot leave partial records.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
const start = page.indexOf("async function applyFillAnswer");
const fn = page.slice(start, page.indexOf("\n  }\n", start));
assert((fn.match(/await fetch\(/g) ?? []).length === 1 && fn.includes("assistant-fill"), "all tab writes are sent in one request");
const service = fs.readFileSync(path.join(__dirname, "../src/lib/admin/authoring/apply-answer.ts"), "utf8");
assert(service.includes("db.transaction().execute") && service.includes(".forUpdate()"), "server transaction locks and re-reads current records");
assert(!fn.includes("Bahagian sebelumnya sudah disimpan"), "the always-true-claim is gone");
assert(!page.includes("istilah sempat ditambah sebelum ralat") && page.includes("Sahkan &amp; tambah glosari"), "glossary uses explicit confirmation instead of partial per-term writes");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
