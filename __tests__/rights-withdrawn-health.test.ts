/**
 * A published work whose source rights are now "restricted" or "rejected" stays public (readers are served the published version) until it is
 * archived by hand. Nothing said so. The editorial dashboard now lists such works (no automatic withdrawal: that is a policy decision for the
 * owner); "needs review" is a review warning, not on this list.
 */
import fs from "node:fs";
import path from "node:path";
import { RIGHTS_BLOCKING, RIGHTS_STATUS_WORDS } from "../src/lib/admin/editorial-health";
import { CHECK_LABELS } from "../src/lib/admin/dashboard-labels";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
assert(RIGHTS_BLOCKING.join() === "restricted,rejected" && !(RIGHTS_BLOCKING as readonly string[]).includes("needs_review"), "only restricted and rejected count; needs_review does not");
assert(RIGHTS_STATUS_WORDS.restricted === "terhad" && RIGHTS_STATUS_WORDS.rejected === "ditolak", "the dashboard says it in Malay");
const health = read("src/lib/admin/editorial-health.ts");
assert(health.includes('.select(["work_id", "author", "rights_status"])') && health.includes("health.rights.status = \"fail\"") && health.includes('tab: "source"'), "published works with such a status fail the check and point to the Sumber & Hak tab");
assert(health.includes("...health.rights.issues") && health.includes("rights: health.rights.status"), "it is in the report too");
assert(CHECK_LABELS.rights.title === "Hak sumber" && read("src/lib/admin/editorial-issues.ts").includes('{ name: "rights", severity: "high" as const }'), "it has its own words and enters the issue queue as an important issue");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
