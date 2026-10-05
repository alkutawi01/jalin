/**
 * Audit finding: deleting a submission removed its contributions first and then failed on the foreign key (a promoted work or a picture
 * request still refers to it), leaving a half-deleted submission. It is one transaction now; a refusal changes nothing and says why (409).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const del = read("src/lib/admin/submission-service.ts");
const body = del.slice(del.indexOf("export async function deleteSubmission"));
assert(body.includes("db.transaction().execute(async (trx) =>") && body.includes('trx.deleteFrom("submission_contributions")') && body.includes('trx.deleteFrom("work_submissions")'), "both deletes are in one transaction");
assert(body.includes('=== "23503"') && body.includes("Tiada apa yang diubah"), "a foreign-key refusal says why and that nothing changed");
assert(read("src/app/api/admin/submissions/[id]/route.ts").includes('message.includes("tidak boleh dipadam") ? 409 : 500'), "the route answers 409 for it");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
