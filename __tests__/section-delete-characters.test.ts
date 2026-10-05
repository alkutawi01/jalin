/**
 * Deleting a chapter that a character still lists as their first appearance left the character pointing at nothing (the character form
 * itself rejects such a reference). It is now refused with a 409 naming the characters; nothing changes until they are moved. Checked on a
 * temporary database branch with the 31-chapter Waktu Sebenar: refused with the chapter count unchanged, then deleted once the character
 * was moved, with positions renumbered.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const service = read("src/lib/admin/section-service.ts");
const del = service.slice(service.indexOf("export async function deleteSection"), service.indexOf("export async function reorderSections"));
assert(del.includes(".forUpdate()") && del.includes("c.firstAppearanceSection === existing.slug") && del.includes("masih dirujuk sebagai kemunculan pertama watak"), "a chapter that a character first appears in cannot be deleted, and the message names them");
assert(del.indexOf("masih dirujuk") < del.indexOf('deleteFrom("reading_sections")'), "checked under the work's lock before anything is deleted");
assert(read("src/app/api/admin/works/[id]/sections/[sectionId]/route.ts").includes('message.includes("masih dirujuk") || message.includes("Perlu disahkan") ? 409'), "answered as 409");
// Saving characters judges the chapters under the same work lock (a chapter cannot vanish between the check and the write).
const work = read("src/lib/admin/work-service.ts");
const save = work.slice(work.indexOf("export async function updateWorkCharacters"));
assert(save.indexOf(".forUpdate()") > 0 && save.indexOf(".forUpdate()") < save.indexOf('selectFrom("reading_sections")') && save.indexOf('selectFrom("reading_sections")') < save.indexOf("characterProblems(validated"), "updateWorkCharacters takes the lock, then reads the chapters, then judges them, all in one transaction");
assert(!save.includes('const chapterSlugs = (await db.selectFrom("reading_sections")'), "the unlocked read of the chapters before the transaction is gone");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
