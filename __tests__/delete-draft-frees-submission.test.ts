/**
 * Deleting a draft that was never published removed its credits, glossary and pictures, but two tables name a work without a link
 * in the database: the submission the draft was promoted from stayed "sudah dipromosikan ke Work …" for a work that no longer
 * exists (so it could never be promoted again), and the editorial problems of the deleted work stayed listed.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const service = fs.readFileSync(path.join(__dirname, "..", "src/lib/admin/work-service.ts"), "utf8").replace(/\r\n/g, "\n");
const start = service.indexOf("export async function deleteUnpublishedWork");
const del = service.slice(start, service.indexOf("\n}\n", start));
const gone = del.indexOf('trx.deleteFrom("works").where("id", "=", id)');
const freed = del.indexOf('trx.updateTable("work_submissions").set({ result_work_id: null, promoted_at: null');
const issues = del.indexOf('trx.deleteFrom("editorial_issues").where("work_id", "=", id)');
assert(freed > 0 && freed < gone && del.slice(freed, gone).includes('.where("result_work_id", "=", id)'), "the submission it was promoted from can be promoted again");
assert(issues > 0 && issues < gone, "its editorial problems go with it");
assert(del.indexOf("tidak boleh dipadam, hanya diarkibkan") < Math.min(freed, issues), "only after the work is known never to have been published, in the same transaction");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
