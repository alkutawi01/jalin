/**
 * Archive -> restore to "ready" -> publish again goes through the first-publication path. It labelled the new revision "Penerbitan pertama"
 * and reset the version to v1.0 although the work already had published revisions (v2.3, say). It now continues the numbering.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/lib/admin/publication-service.ts"), "utf8").replace(/\r\n/g, "\n");
const start = src.indexOf("const fresh = await trx");
const block = src.slice(start, src.indexOf("return {", start));
assert(block.includes('"version_label", "published_at", "published_revision_id", "first_published_at"') , "the earlier version, date and history are read BEFORE the row is updated to 'published' (after it, published_at is already now)");
assert(block.indexOf("published_revision_id") < block.indexOf('status: "published"'), "in that order");
assert(block.includes("fresh.published_revision_id || fresh.first_published_at"), "a work with a published revision or first-published date counts as returning");
assert(block.includes("nextVersionLabel(fresh.version_label, fresh.published_at") && block.includes("Diterbitkan semula selepas diarkibkan"), "a returning work gets the next version label and says so");
assert(block.includes('"Penerbitan pertama"') && block.includes("FIRST_VERSION_LABEL"), "a first publication is unchanged");
// An ordinary republish checks readiness again inside its own transaction, on the locked rows, like a first publication does.
const republish = src.slice(src.indexOf("export async function republishWork"));
const txStart = republish.indexOf('.setIsolationLevel("serializable")');
const recheck = republish.indexOf("evaluatePublicationReadinessFromData(locked)");
assert(txStart > 0 && recheck > txStart && recheck < republish.indexOf("createRevisionTx("), "republishWork re-evaluates readiness in its transaction before freezing the new version");
assert(republish.includes("loadReadinessInput(trx, workId, { lock: true })") && republish.includes("Publication readiness (transaksi) gagal"), "on the locked rows, and refuses with the blockers");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
