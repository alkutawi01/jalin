/**
 * Izzat, 9 Okt 2026: writing "[^1]" and a "[^1]: ..." line by hand to get a side note is too much work. The editor types the note's words
 * and presses "+ Nota sisi"; the number goes at the cursor and the note at the end.
 */
import fs from "node:fs";
import path from "node:path";
import { cleanFootnoteText, insertFootnote, isFootnoteDefinition, nextFootnoteLabel } from "../src/lib/admin/footnote-insert";
import { extractFootnotes } from "../src/lib/reader/footnotes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// The number
assert(nextFootnoteLabel("") === "1" && nextFootnoteLabel("Satu dua.") === "1", "the first note is 1");
assert(nextFootnoteLabel("A.[^1] B.[^2]\n\n[^1]: x\n[^2]: y") === "3", "the next note takes the next number");
assert(nextFootnoteLabel("A.[^7]\n\n[^7]: x") === "8" && nextFootnoteLabel("A.[^abc]\n\n[^abc]: x") === "1", "numbered by the highest number used; a named note does not count");

// The words
assert(cleanFootnoteText("  satu\n dua   tiga \n") === "satu dua tiga", "a note is one paragraph: breaks and runs of spaces become single spaces");
assert(insertFootnote("Teks.", 3, "   \n ") === null, "a note with no words is not added");

// Where it goes
const one = insertFootnote("Dia memandang jauh. Hujan turun lagi.", 19, "Nota pertama.")!;
assert(one.body === "Dia memandang jauh.[^1] Hujan turun lagi.\n\n[^1]: Nota pertama." && one.caret === 19 + 4 && one.label === "1", "the number goes at the cursor and the note at the end");
const two = insertFootnote(one.body, 0, "Nota kedua.")!;
assert(two.body.startsWith("[^2]Dia memandang") && two.body.endsWith("[^1]: Nota pertama.\n\n[^2]: Nota kedua.") && two.label === "2", "a second note is added after the first, and may come earlier in the text");
const inNote = insertFootnote(one.body, one.body.length - 3, "Ketiga.")!;
assert(inNote.body.startsWith("Dia memandang jauh.[^1] Hujan turun lagi.[^2]\n\n[^1]: Nota pertama.") && inNote.body.endsWith("[^2]: Ketiga."), "a cursor inside a note's own line puts the number at the end of the story's text instead");
const atEnd = insertFootnote("Hujan.\n\n[^1]: x", 9999, "Lagi.")!;
assert(atEnd.body === "Hujan.[^2]\n\n[^1]: x\n\n[^2]: Lagi.", "a cursor far past the end is the end of the text");
assert(insertFootnote("Teks.", -5, "n")!.body.startsWith("[^1]Teks."), "a cursor before the start is the start");
assert(insertFootnote("Baris satu.\r\nBaris dua.", 11, "n")!.body === "Baris satu.[^1]\nBaris dua.\n\n[^1]: n", "Windows line breaks become plain ones");
assert(isFootnoteDefinition("[^1]: nota") && isFootnoteDefinition("  [^abc]: nota") && !isFootnoteDefinition("Ayat.[^1] lagi") && !isFootnoteDefinition("[^1]"), "a note's own line is told from a sentence with a number in it");

// What the reader makes of it
const made = extractFootnotes(two.body);
assert(made.notes.length === 2 && made.notes[0]!.text === "Nota kedua." && made.notes[1]!.text === "Nota pertama." && made.missingNotes.length === 0 && made.unusedNotes.length === 0, "the reader numbers them by place in the text, finds both notes and nothing is left over");
assert(!made.body.includes("Nota pertama.") && made.body.includes("[^2]Dia"), "the notes are taken out of the text for display");

// The screens
const visual = read("src/components/admin/VisualManuscriptEditor.tsx");
const page = read("src/app/admin/works/[id]/page.tsx");
assert(visual.includes("<FootnoteInserter onInsert={insertFootnoteAtCursor} />") && visual.includes("nextFootnoteLabel(value)") && visual.includes("isFootnoteDefinition("), "the visual editor has the button and keeps the number out of a note's own line");
assert(page.includes("<FootnoteInserter onInsert={addFootnote} />") && page.includes("insertFootnote(form.body, textarea ? textarea.selectionStart : form.body.length, text)"), "the Markdown box has it too");
const box = read("src/components/admin/FootnoteInserter.tsx");
assert(box.includes("+ Nota sisi") && box.includes("Sisip nota") && box.includes("Batal") && box.includes('e.key === "Escape"') && !/\b(window\.)?(prompt|alert|confirm)\(/.test(box), "the box is in Malay, closes on Escape and uses no browser dialog");
assert(box.includes("disabled={!cleanFootnoteText(text)}"), "a note with no words cannot be sent");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
