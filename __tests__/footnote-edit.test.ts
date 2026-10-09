/**
 * Izzat, 9 Okt 2026: "how do I edit the side note?" A note is a number in a sentence and a line at the end; the editor needs to see them
 * all, rewrite one, and remove one (number and words together) without hunting through a long manuscript.
 */
import fs from "node:fs";
import path from "node:path";
import { footnoteOverview, footnoteReferenceRange, removeFootnote, setFootnoteText } from "../src/lib/admin/footnote-edit";
import { extractFootnotes } from "../src/lib/reader/footnotes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const BODY = [
  "Dia memandang jauh.[^b] Hujan turun lagi.[^a]",
  "",
  "Esoknya ia reda.[^b]",
  "",
  "[^a]: Nota A.",
  "[^b]: Nota B yang panjang",
  "  bersambung di baris kedua.",
  "",
  "[^c]: Nota C tanpa nombor."
].join("\n");

// What is there
const view = footnoteOverview(BODY);
assert(view.notes.map((n) => `${n.number}:${n.label}`).join() === "1:b,2:a", "notes are numbered as a reader sees them: by the first number in the text, whatever the labels");
assert(view.notes[0]!.text === "Nota B yang panjang bersambung di baris kedua." && view.notes[1]!.text === "Nota A.", "a note's lines are read as one paragraph");
assert(view.notes[0]!.context === "Dia memandang jauh." && view.notes[1]!.context === "Dia memandang jauh. Hujan turun lagi.", "each note shows the words before its number, to tell them apart");
assert(view.unused.length === 1 && view.unused[0]!.label === "c" && view.unused[0]!.text === "Nota C tanpa nombor." && view.missing.length === 0, "a note nothing points to is listed apart");
const miss = footnoteOverview("Satu.[^1] Dua.[^2]\n\n[^1]: A");
assert(miss.missing.length === 1 && miss.missing[0]!.label === "2" && miss.notes.length === 1, "a number with no note is listed apart");
const none = footnoteOverview("Tiada nota di sini.\n\nHanya teks.");
assert(none.notes.length === 0 && none.missing.length === 0 && none.unused.length === 0, "a manuscript with no notes has nothing listed");
const fenced = footnoteOverview("Kod:\n\n```\n[^x] dan [^x]: bukan nota\n```\n\nTeks `[^y]` biasa.");
assert(fenced.notes.length === 0 && fenced.missing.length === 0 && fenced.unused.length === 0, "text inside a code fence or inline code is not a note");
assert(footnoteOverview(BODY.replace(/\n/g, "\r\n")).notes.length === 2, "Windows line breaks read the same");
const long = footnoteOverview(`${"Perkataan ".repeat(30)}akhir.[^1]\n\n[^1]: x`);
assert(long.notes[0]!.context.startsWith("…") && long.notes[0]!.context.length <= 82 && long.notes[0]!.context.endsWith("akhir."), "a long sentence is cut at a word, with the end that matters");

// Rewriting
const edited = setFootnoteText(BODY, "b", "  Nota B\n baharu  ")!;
assert(edited.includes("[^b]: Nota B baharu\n\n[^c]") && !edited.includes("bersambung di baris kedua") && edited.includes("[^a]: Nota A."), "the words of one note are replaced (all its lines); the others are untouched");
assert(edited.split("\n").length === BODY.split("\n").length - 1, "only that note's lines changed");
assert(extractFootnotes(edited).notes[0]!.text === "Nota B baharu", "the reader reads the rewritten note");
assert(setFootnoteText(BODY, "b", "  \n ") === null, "a note cannot be given no words");
const added = setFootnoteText("Satu.[^7]", "7", "Baru.")!;
assert(added === "Satu.[^7]\n\n[^7]: Baru.", "a number with no note gets its note at the end");
const dup = setFootnoteText("A.[^1]\n\n[^1]: Satu\n\n[^1]: Dua", "1", "Baharu")!;
assert(dup === "A.[^1]\n\n[^1]: Baharu", "a repeated note of the same label goes when the note is rewritten");

// Removing
const gone = removeFootnote(BODY, "b");
assert(!gone.includes("[^b]") && !gone.includes("Nota B") && !gone.includes("bersambung") && gone.includes("[^a]: Nota A.") && gone.includes("[^a]") , "removing a note takes its number (every one) and all its words");
assert(gone.startsWith("Dia memandang jauh. Hujan turun lagi.[^a]\n\nEsoknya ia reda.\n\n[^a]: Nota A.") && gone.endsWith("[^c]: Nota C tanpa nombor."), "nothing else is changed and no gap is left");
assert(removeFootnote("Hujan.[^1]\n\n[^1]: x", "1") === "Hujan.", "removing the only note leaves the text clean");
assert(removeFootnote("A.[^1] B.[^11]\n\n[^1]: x\n[^11]: y", "1") === "A. B.[^11]\n\n[^11]: y", "[^1] does not take [^11] with it");
assert(removeFootnote("Teks [^9]\n\nLagi.", "9") === "Teks\n\nLagi.", "a number at the end of a line leaves no trailing space");
const afterRemove = footnoteOverview(removeFootnote(BODY, "a"));
assert(afterRemove.notes.length === 1 && afterRemove.notes[0]!.label === "b" && afterRemove.notes[0]!.number === 1, "the notes after one is removed are numbered again for the reader");
assert(removeFootnote(BODY, "zzz") === BODY.replace(/\s+$/, ""), "removing a label that is not there changes nothing");
const kept = "Kod:\n\n```\n[^1]\n```\n\nTeks.[^1]\n\n[^1]: x";
assert(removeFootnote(kept, "1") === "Kod:\n\n```\n[^1]\n```\n\nTeks.", "a number inside a code fence is not touched");

// Where the number is
const place = footnoteReferenceRange(BODY, "a")!;
assert(BODY.slice(place.start, place.end) === "[^a]" && place.start === BODY.indexOf("[^a]"), "the first number of a note can be found for the cursor");
assert(footnoteReferenceRange(BODY, "c") === null && footnoteReferenceRange(BODY, "nope") === null, "a note with no number has no place in the text");

// The screens
const panel = read("src/components/admin/SideNoteList.tsx");
assert(panel.includes("footnoteOverview(body)") && panel.includes("setFootnoteText(") && panel.includes("removeFootnote(") && panel.includes("confirmAction(") && !/\b(window\.)?(prompt|alert|confirm)\(/.test(panel), "the list reads, rewrites and removes through the same functions, and asks before removing (no browser dialog)");
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes("<SideNoteList") && page.includes("footnoteReferenceRange(") && page.includes("onChange={(body)"), "the work page shows the list under the manuscript");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
