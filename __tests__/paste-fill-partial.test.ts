/**
 * Tampal & isi writes in steps (maklumat, watak, glosari, sumber). When one fails part-way the note must say truthfully whether the earlier
 * steps were saved (it always claimed "Bahagian sebelumnya sudah disimpan", even when the very first write had failed).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
const start = page.indexOf("async function pasteFillFromClipboard");
const fn = page.slice(start, page.indexOf("\n  }\n", start));
assert((fn.match(/wrote \+= 1/g) ?? []).length === 4, "each of the four write steps (maklumat, watak, glosari per istilah, sumber) is counted when it succeeds");
assert(fn.includes('"Tiada apa-apa disimpan."') && fn.includes("wrote > 0"), "an error before any write says nothing was saved");
assert(!fn.includes("Bahagian sebelumnya sudah disimpan"), "the always-true-claim is gone");
assert(fn.includes("istilah sempat ditambah sebelum ralat"), "a glossary failure part-way reports how many terms were added");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
