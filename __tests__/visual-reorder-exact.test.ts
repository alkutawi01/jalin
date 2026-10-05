/**
 * Reordering a work's pictures updated them one by one with no transaction and no check of the list (a string iterated character by character,
 * a repeated, missing or foreign id left a meaningless order). Now the list must be exactly the work's pictures, each once, applied in one
 * transaction. Checked on a temporary database branch: the exact set reversed applied; missing, duplicate, foreign, extra, non-array and
 * fractional lists were all refused with nothing changed.
 * The losing side of a simultaneous replacement also stops showing its request as attached.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const service = read("src/lib/admin/visual-service.ts");
const reorder = service.slice(service.indexOf("export async function reorderVisuals"));
assert(reorder.includes("!Array.isArray(visualIds)") && reorder.includes("Number.isInteger(id)") && reorder.includes("new Set(visualIds).size !== visualIds.length"), "the list must be an array of whole numbers without repeats");
assert(reorder.includes("db.transaction()") && reorder.includes(".forUpdate()") && reorder.includes("ownedIds.size !== visualIds.length"), "and exactly the work's own pictures, checked and applied in one locked transaction");
assert(reorder.indexOf("ownedIds.size !== visualIds.length") < reorder.indexOf("set({ sort_order: i + 1 })"), "nothing is written before the check");
assert(read("src/app/api/admin/visuals/route.ts").includes('message.includes("tidak sah") ? 400 : 500'), "a refused list is a 400");
const upload = read("src/lib/admin/visual-generation/work-visual-upload.ts");
assert(upload.includes('set({ status: "failed"') && upload.includes("result.visualRequestId") && upload.indexOf('status: "failed"') < upload.indexOf("sudah diganti oleh permintaan lain"), "a replacement that lost marks its request failed (the stored file stays as provenance)");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
