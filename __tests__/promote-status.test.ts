/**
 * Audit finding: POST /api/admin/submissions/[id]/promote took any status from the body, so a work could be created already "published"
 * with no readiness check, rights review or frozen revision. A promoted work starts as draft, review or ready; publishing is only the
 * publish button.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const route = read("src/app/api/admin/submissions/[id]/promote/route.ts");
assert(route.includes('["draft", "review", "ready"].includes(String(status))') && route.includes("status: 400"), "the route refuses any status but draft, review or ready");
assert(route.includes('message.startsWith("Status tidak sah") ? 400 : 500'), "a refusal from the service is also a 400");
const service = read("src/lib/admin/promotion-service.ts");
assert(service.includes('options.status === "published" || options.status === "archived"') && service.indexOf("tidak boleh terus diterbitkan") < service.indexOf('.insertInto("works")'), "the service refuses it too, before the work is created");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
