/**
 * Audit finding: POST /api/admin/works/import cast `edits` without checking its shape; a wrong shape threw a TypeError that was returned as a
 * 500 with the JavaScript error text. The plan builder's TypeError/RangeError on the request's input is now a 400 in Malay.
 */
import fs from "node:fs";
import path from "node:path";
import { buildImportPlan } from "../src/lib/admin/import/plan";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/works/import/route.ts"), "utf8").replace(/\r\n/g, "\n");
assert(route.includes("error instanceof TypeError || error instanceof RangeError") && route.includes("status: 400") && route.includes("Suntingan pada skrin semakan tidak sah"), "a TypeError from the plan builder is a 400 with a Malay message");
assert(route.indexOf("try {\n      result = buildImportPlan") > 0, "only the plan builder call is guarded");
// the reason: a wrong shape does throw
let threw = "";
try { buildImportPlan("JSON\n{}\n", "x", { edits: "bukan objek" as never }); } catch (e) { threw = (e as Error).constructor.name; }
assert(threw === "" || threw === "TypeError", "a wrong 'edits' either is ignored or throws a TypeError (the case the route now answers)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
