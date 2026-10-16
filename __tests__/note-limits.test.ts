/** The two reader-facing notes have one limit each, used by the form's save, the pasted chatbot answer and the counters. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertNoteFits, noteTooLongMessage, READER_NOTE_LABEL, READER_NOTE_MAX, EDITOR_NOTE_LABEL, EDITOR_NOTE_MAX } from "../src/lib/admin/note-limits";

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
function throwsWith(fn: () => unknown, part: string): boolean {
  try { fn(); return false; } catch (e) { return e instanceof Error && e.message.includes(part); }
}
const src = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

ok(READER_NOTE_MAX === 600 && EDITOR_NOTE_MAX === 5000, "the limits are 600 (card note) and 5000 (editor's note)");
ok(assertNoteFits(READER_NOTE_LABEL, "a".repeat(600), READER_NOTE_MAX).length === 600, "a note exactly at the limit is accepted");
ok(assertNoteFits(READER_NOTE_LABEL, "", READER_NOTE_MAX) === "", "an empty note is accepted");
ok(throwsWith(() => assertNoteFits(READER_NOTE_LABEL, "a".repeat(601), READER_NOTE_MAX), "601 aksara; maksimum 600"), "one character over is refused and says how long it is");
ok(throwsWith(() => assertNoteFits(READER_NOTE_LABEL, "a".repeat(1034), READER_NOTE_MAX), "1,034 aksara"), "the length is written with a thousands separator");
ok(throwsWith(() => assertNoteFits(EDITOR_NOTE_LABEL, "a".repeat(5001), EDITOR_NOTE_MAX), "Catatan terlalu panjang"), "the editor's note names itself in the message");
ok(throwsWith(() => assertNoteFits(READER_NOTE_LABEL, "a".repeat(700), READER_NOTE_MAX), "tiada perubahan disimpan"), "a pasted answer is told nothing was saved");
ok(noteTooLongMessage("X", 10, 5) === "X terlalu panjang (10 aksara; maksimum 5).", "the form's message has the same shape");

// every path that writes a note uses the shared limit rather than its own number
const route = src("src/app/api/admin/works/[id]/route.ts");
ok(route.includes("READER_NOTE_MAX") && route.includes("EDITOR_NOTE_MAX") && !/readerNote\.length > 600|editorNote\.length > 5000/.test(route), "the form's save uses the shared limits");
const service = src("src/lib/admin/authoring/editor-answer-service.ts");
ok(service.includes("assertNoteFits(READER_NOTE_LABEL") && service.includes("assertNoteFits(EDITOR_NOTE_LABEL"), "a pasted chatbot answer is held to the same limits");
const page = src("src/app/admin/works/[id]/page.tsx");
ok(page.includes("maxLength={READER_NOTE_MAX}") && page.includes("maxLength={EDITOR_NOTE_MAX}"), "the fields take their limit from the same constants");
ok(page.includes("form.readerNote.length") && page.includes("form.editorNote.length"), "both fields show how many characters are used");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
