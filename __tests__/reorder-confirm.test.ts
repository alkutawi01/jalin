/**
 * Audit finding: the series reorder asked for confirmation AFTER the new order was already saved ("confirm" confirmed something that had
 * happened), and an empty workIds list reached SQL and gave a 500. The question is now asked before anything is written, and an empty
 * list is a 400.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/series/[id]/entries/reorder/route.ts"), "utf8").replace(/\r\n/g, "\n");
assert(route.includes("body.workIds.length === 0") && route.includes("status: 400"), "an empty list is a 400");
assert(route.indexOf("requiresConfirmation: true") < route.indexOf("await reorderSeriesEntries(id, wanted)"), "the confirmation is asked before the order is written");
assert(route.includes('w.status === "published"') && route.includes("current[index]?.work_id !== workId"), "it is asked only when a published episode would move");
assert(route.includes("belum ada yang diubah"), "the message says nothing has changed yet");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
