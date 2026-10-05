/**
 * Two "Ganti gambar" requests for the same picture at once (a double click) both attached a new visual and both deleted the old one, leaving two
 * pictures in one place. The swap now locks the old row; the loser removes its own new visual and the API answers 409. Checked on a temporary
 * database branch: of two concurrent swaps exactly one returned true and kept the old picture's order and crop, the other returned false, the old
 * picture was gone and only the winner's new picture remained; swapping when the old row had already vanished returned false.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/lib/admin/visual-generation/work-visual-upload.ts"), "utf8").replace(/\r\n/g, "\n");
const swap = src.slice(src.indexOf("export async function swapReplacedVisual"), src.indexOf("export type ReplaceVisualResult"));
assert(swap.includes(".forUpdate()") && swap.indexOf(".forUpdate()") < swap.indexOf("updateTable(\"visuals\")") && swap.indexOf(".forUpdate()") < swap.indexOf('deleteFrom("visuals").where("id", "=", old.id)'), "the old row is locked before anything is changed");
assert(swap.includes("if (!stillThere)") && swap.includes('deleteFrom("visuals").where("id", "=", newVisualId)') && swap.includes("return false"), "a loser removes its own new visual and reports it");
const replace = src.slice(src.indexOf("export async function replaceVisualImage"));
assert(replace.includes("swapReplacedVisual(db, old, result.visualId)") && replace.includes("status: 409") && replace.includes("sudah diganti oleh permintaan lain"), "the replacement answers 409 when it lost");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
