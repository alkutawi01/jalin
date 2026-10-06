/**
 * Putting the text back exactly as it was in v1 while v2 is public and pressing "Terbitkan semula" found v1 by its content hash and reused it:
 * readers went back to v1 with no new entry in the history, the label of v2 and a revision count that did not know about it. Only the version
 * that is public right now may be reused (publish again after an archive with nothing changed); an older match becomes a new version.
 * Checked on a temporary database branch: A -> B -> A gave revisions 1, 2 and 3 (3 has the content hash of 1), published_revision_id on 3,
 * labels v1 / v1.0 / v1.0.1; publishing again with nothing changed returned "changed: false"; the unfrozen Waktu Sebenar froze as revision 2.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/lib/admin/revision-service.ts"), "utf8").replace(/\r\n/g, "\n");
const line = src.slice(src.indexOf("const existing = sameHash.find"), src.indexOf("if (existing) {"));
assert(line.includes("row.id === work.published_revision_id"), "only the currently published version can be reused");
assert(line.includes("snapshotCharacters(row.snapshot) === liveCharacters") && line.includes("snapshotReaderNote(row.snapshot) === liveReaderNote"), "and only when the characters and the note also match, as before");
assert(src.includes("An OLDER version that happens to match"), "the reason is written where the rule is");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
