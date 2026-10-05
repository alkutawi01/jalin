/**
 * POST .../revisions/[revisionId]/revert restored only some columns of the work and published the result without the readiness checks; no page
 * calls it. It answers 501 (after the sign-in check) until a whole-snapshot, single-transaction rollback exists.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/works/[id]/revisions/[revisionId]/revert/route.ts"), "utf8").replace(/\r\n/g, "\n");
assert(!route.includes("revertRevision") && route.includes("status: 501"), "the route no longer calls the half-restoring function and answers 501");
assert(route.indexOf("getCurrentAdmin()") > 0 && route.indexOf("status: 401") < route.indexOf("status: 501"), "signed-out callers still get 401 first");
const ui = ["src/app", "src/components"].flatMap((d) => {
  const out: string[] = [];
  const walk = (dir: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx$/.test(e.name)) out.push(fs.readFileSync(p, "utf8")); } };
  walk(path.join(__dirname, "..", d));
  return out;
});
assert(!ui.some((s) => s.includes("/revert")), "no page or component calls the revert address");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
