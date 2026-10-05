/**
 * The note in the reader's "Tentang karya" card can be edited in the admin, and clearing a note that was frozen into the
 * published version counts as a change (found on a Neon branch: republishing answered "no change" and the note stayed).
 */
import fs from "node:fs";
import path from "node:path";
import { readerNoteOf } from "../src/lib/admin/revision-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(readerNoteOf(null) === "" && readerNoteOf(undefined) === "" && readerNoteOf({}) === "", "no note reads as empty");
assert(readerNoteOf({ note: "  Satu nota.  " }) === "Satu nota.", "a note is read trimmed");
assert(readerNoteOf('{"note":"Dari teks JSON"}') === "Dari teks JSON", "a note stored as JSON text is read");
assert(readerNoteOf("bukan json") === "", "unreadable stored text gives no note");

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const revision = read("src/lib/admin/revision-service.ts");
assert(/readerNoteOf\(\(live\.work as \{ reader\?: unknown \}\)\.reader\) !== snapshotReaderNote\(rev\.snapshot\)/.test(revision), "an unpublished-changes check compares the note with the published one");
assert(revision.includes("snapshotReaderNote(row.snapshot) === liveReaderNote"), "republishing does not reuse a revision whose note differs");
const route = read("src/app/api/admin/works/[id]/route.ts");
assert(route.includes("readerNote") && route.includes("600"), "the work API accepts the note, limited to 600 characters");
const service = read("src/lib/admin/work-service.ts");
assert(/updateData\.reader = note \? \{ note \} : null/.test(service), "an empty note removes it");
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes('id="readerNote"') && page.includes("work.reader?.note"), "the Maklumat tab has the field and loads the stored note");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
