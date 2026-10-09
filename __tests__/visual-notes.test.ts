/**
 * Izzat, 9 Okt 2026, on side notes: "how do I edit the note?" In the visual editor a note's number is a chip in the text and its words are kept
 * apart, opened by a click. This checks the part that needs no browser (reading the manuscript into text, chips and notes, and writing them back
 * together so that nothing a reader sees changes) and that the editor wires it up.
 */
import fs from "node:fs";
import path from "node:path";
import { splitFootnotes } from "../src/lib/admin/footnote-edit";
import { extractFootnotes } from "../src/lib/reader/footnotes";
import { buildNoteContext, joinProseAndNotes, labelsInHtml, noteChipHtml, noteWithText, notesToWrite, withNoteChips } from "../src/lib/admin/visual-notes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const BODY = [
  "Dia memandang jauh.[^b] Hujan turun lagi.[^a]",
  "",
  "Esoknya ia reda.[^b] Satu lagi tanpa nota.[^z]",
  "",
  "[^a]: Nota A.",
  "[^b]: Nota B yang panjang",
  "  bersambung di baris kedua.",
  "",
  "[^c]: Nota C tanpa nombor."
].join("\n");

// Splitting
const split = splitFootnotes(BODY);
assert(split.prose === "Dia memandang jauh.[^b] Hujan turun lagi.[^a]\n\nEsoknya ia reda.[^b] Satu lagi tanpa nota.[^z]", "the text is the manuscript without its notes, with nothing else changed");
assert(split.definitions.map((d) => d.label).join() === "a,b,c" && split.definitions[1]!.raw === "[^b]: Nota B yang panjang\n  bersambung di baris kedua." && split.definitions[1]!.text === "Nota B yang panjang bersambung di baris kedua.", "each note is kept as written (all its lines) and as one paragraph of words");
assert(splitFootnotes("Tiada nota.\r\n\r\nSatu lagi.").prose === "Tiada nota.\r\n\r\nSatu lagi." && splitFootnotes("Tiada nota.").definitions.length === 0, "a manuscript with no notes comes back untouched, line breaks included");
assert(splitFootnotes("A.\n\n[^1]: x\n\nB.").prose === "A.\n\nB." && splitFootnotes("[^1]: x\n\nTeks.").prose === "Teks.", "notes in the middle or at the start leave no gap");
assert(splitFootnotes("Kod:\n\n```\n[^1]: bukan nota\n```").definitions.length === 0, "a code fence is not a note");

// The context
const { prose, context } = buildNoteContext(BODY);
assert(prose === split.prose, "the context starts from the same text");
assert(context.numbers.b === 1 && context.numbers.a === 2 && context.numbers.z === undefined && context.numbers.c === undefined, "numbers are those a reader sees: by first appearance, only for numbers that have a note");
assert(context.orphans.join() === "c" && context.definitions.size === 3, "a note nothing points to is remembered as a leftover");

// Chips
assert(noteChipHtml("b", 1, "Isi <nota> & \"petikan\"").includes('contenteditable="false"') && noteChipHtml("b", 1, "x").includes('data-note="b"') && noteChipHtml("b", 1, "x").includes('role="button"') && noteChipHtml("b", 1, "x").includes('tabindex="0"') && noteChipHtml("b", 1, "x").includes('aria-label="Nota 1: sunting"') && noteChipHtml("b", 1, "x").endsWith(">1</sup>"), "a chip cannot be typed into, can be focused and clicked, and has a name for a screen reader");
assert(noteChipHtml("b", 1, "Isi <nota> & \"petikan\"").includes('title="Isi &lt;nota&gt; &amp; &quot;petikan&quot;"') && noteChipHtml("b", 1, "p".repeat(200)).includes(`title="${"p".repeat(140)}…"`), "its tooltip is the note's words, escaped and cut after 140 characters");
const html = withNoteChips("Dia memandang jauh.[^b] Hujan.[^a] Tanpa.[^z]", context);
assert(html.includes('data-note="b"') && html.includes('data-note="a"') && html.includes("Tanpa.[^z]") && labelsInHtml(html).join() === "b,a", "numbers with a note become chips; a number with no note stays as typed");
assert(withNoteChips("Tiada nombor di sini.", context) === "Tiada nombor di sini.", "text with no numbers is untouched");

// Writing back
assert(notesToWrite(["b", "a"], context).join("|") === "[^b]: Nota B yang panjang\n  bersambung di baris kedua.|[^a]: Nota A.|[^c]: Nota C tanpa nombor.", "the notes whose chips are in the text are written in order of their first chip, then the leftovers, each as it was written");
assert(notesToWrite(["a"], context).join("|") === "[^a]: Nota A.|[^c]: Nota C tanpa nombor.", "a note whose chip was deleted is not written back, and a leftover that was never the editor's doing is kept");
assert(notesToWrite(["b", "b", "a", "nope"], context).length === 3, "a repeated chip writes its note once, and a chip with no note writes nothing");
context.definitions.set("b", noteWithText("b", "  Nota\n B baharu  "));
assert(notesToWrite(["b"], context)[0] === "[^b]: Nota B baharu", "an edited note is written as one line of its new words");
assert(joinProseAndNotes("Teks.", ["[^1]: a", "[^2]: b"]) === "Teks.\n\n[^1]: a\n\n[^2]: b" && joinProseAndNotes("Teks.", []) === "Teks." && joinProseAndNotes("", ["[^1]: a"]) === "[^1]: a", "the text and the notes are put together with one blank line between each");

// Nothing the reader sees changes
const reread = (body: string) => {
  const r = extractFootnotes(body);
  return JSON.stringify(r.notes.map((n) => [n.label, n.number, n.text]));
};
const fresh = buildNoteContext(BODY);
const together = joinProseAndNotes(fresh.prose, notesToWrite(["b", "a"], fresh.context));
assert(reread(together) === reread(BODY) && extractFootnotes(together).body === extractFootnotes(BODY).body, "writing the text and the notes back gives a manuscript the reader reads the same: same notes, same numbers, same words");
const notesInMiddle = "A.[^1]\n\n[^1]: Satu\n\nB.[^2]\n\n[^2]: Dua";
const middle = buildNoteContext(notesInMiddle);
assert(reread(joinProseAndNotes(middle.prose, notesToWrite(["1", "2"], middle.context))) === reread(notesInMiddle), "notes that were between the paragraphs are read the same once they are after the text");

// The editor
const editor = read("src/components/admin/VisualManuscriptEditor.tsx");
assert(editor.includes("buildNoteContext(value)") && editor.includes("toHtml(prose, context)") && editor.includes("splitCommunicationBlocks(splitFootnotes(markdown).prose)"), "the editor reads the manuscript into text and notes, and judges whether it can be edited visually by the text alone");
assert(editor.includes("joinProseAndNotes(fromHtml(editor), notesToWrite(labels, notesRef.current))") && editor.includes('node.tagName === "SUP" && node.dataset.note') && editor.includes("renumberNotes(editor)"), "on every change the chips are renumbered and written back as numbers with the notes after the text");
assert(editor.includes("value !== emittedRef.current && value !== drawnRef.current") && editor.includes("drawnRef.current = null"), "the text is drawn again only when it came from somewhere else, not because the page redrew (that lost the cursor)");
assert(editor.includes("openNote(chip)") && editor.includes('closest<HTMLElement>("[data-note]")') && editor.includes('event.key === "Enter" || event.key === " "'), "a click, or Enter or Space on a focused chip, opens its note");
assert(editor.includes('role="dialog"') && editor.includes("Sunting nota") && editor.includes("Simpan nota") && editor.includes("Padam nota") && editor.includes("confirmAction(`Padam nota"), "the box can read, change and remove a note, and asks before removing");
assert(editor.includes("noteChipBeside(selection") && editor.includes('document.execCommand("delete")') && editor.includes('event.key === "Backspace" || event.key === "Delete"'), "Backspace or Delete next to a chip removes it through the browser's own command, so Undo brings it back");
assert(editor.includes('event.key === "Escape"') && editor.includes("closeNote(true)") && editor.includes('addEventListener("scroll", close, true)'), "Escape closes the box and returns to the chip; moving the page closes it");
assert(editor.includes('before.textContent.replace(/\\u00a0$/, " ")') && editor.includes('after.textContent.replace(/^\\u00a0/, " ")'), "the non-breaking spaces a browser puts beside a new chip are turned back into ordinary spaces (found by the browser test)");
assert(!editor.includes("style={{"), "no inline style objects");
assert(read("__tests__/visual-notes.browser.mjs").includes("Esoknya\\[\\^\\d+\\] ia reda") && read("package.json").includes('"test:visual-editor-ui"'), "a real-browser test of the notes exists and has an npm script (needs Chrome, so it is not part of npm test)");
const css = read("src/app/globals.css");
assert(css.includes(".visual-manuscript-note {") && css.includes("cursor: pointer;") && css.includes(".visual-manuscript-popover {") && css.includes("position: fixed;"), "the chip and the box have their styles (the box is fixed, so the editor's scrolling area does not cut it off)");
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes('surface.querySelector<HTMLElement>(`[data-note="${label}"]`)') && page.includes("chip.focus({ preventScroll: true })"), "from the list of notes, 'Pergi ke ayat' goes to the chip");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
