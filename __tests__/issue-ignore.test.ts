/**
 * Audit finding: "Abaikan" on an editorial issue lasted only until the next sync: the sync looked for an open or a resolved copy of the
 * problem, found neither (it was ignored) and opened a new one. Manual status changes also left no history and kept a stale resolved_at.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const sync = read("src/lib/admin/editorial-issues.ts");
assert(sync.includes('.where("status", "=", "ignored")') && sync.indexOf('"ignored"') < sync.indexOf("// Check if there's a resolved issue"), "the sync looks for an ignored copy before it creates a new one");
assert(sync.includes("if (existingIgnored) continue;"), "an ignored problem stays ignored while it is still there");
const route = read("src/app/api/admin/editorial-issues/[id]/route.ts");
assert(route.includes('resolved_at: body.status === "resolved" ? new Date().toISOString() : null'), "resolved_at is set only for resolved and cleared otherwise");
assert(route.includes("recordIssueEvent(id,") && route.includes('"ignore"'), "a manual change is on the issue's history");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
