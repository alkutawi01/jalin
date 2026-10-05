/**
 * A work with status "published" but no published_revision_id is served from the live working copy: every edit reaches readers at once without
 * "Terbitkan semula". The dashboard only checked a revision id that existed but pointed nowhere. A read-only audit of a copy of production found
 * exactly one such work (Waktu Sebenar, restored and waiting for its first "Terbitkan semula"); the check now lists it. No automatic freezing:
 * the fallback to the working copy stays until every work has a frozen version.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const health = fs.readFileSync(path.join(__dirname, "../src/lib/admin/editorial-health.ts"), "utf8").replace(/\r\n/g, "\n");
const block = health.slice(health.indexOf("// Check revisions"), health.indexOf("// Pictures: no check"));
assert(block.includes("} else {") && block.includes("belum dibekukan: pembaca melihat salinan kerja semasa") && block.includes('fix: "Terbitkan semula"'), "a published work with no published_revision_id is listed, with the button 'Terbitkan semula'");
assert(block.includes('health.revisions.status = "fail"'), "and the check fails");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
