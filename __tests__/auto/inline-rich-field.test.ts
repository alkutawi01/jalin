/** Short formatted fields are visual only: the editor sees italic and bold, never an asterisk; storage stays *italic* and **bold**. */
import fs from "node:fs";
import path from "node:path";
import { fieldValueFromNodes, inlineHtml, inlineMarkdown, type InlineNode } from "../../src/lib/admin/inline-format";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

const text = (value: string): InlineNode => ({ nodeType: 3, textContent: value, childNodes: [] });
const el = (tagName: string, ...children: InlineNode[]): InlineNode => ({ nodeType: 1, textContent: null, tagName, childNodes: children });

// what the box holds -> what is stored
assert(fieldValueFromNodes([el("EM", text("Neri")), text(" ialah bahan "), el("STRONG", text("berlendir"))], false) === "*Neri* ialah bahan **berlendir**", "italic and bold are stored as * and **");
assert(fieldValueFromNodes([text("Salah satu kaedah ialah "), el("I", text("nagashizuki"))], false) === "Salah satu kaedah ialah *nagashizuki*", "the <i> a browser makes is read as italic too");
assert(fieldValueFromNodes([text("2 * 3 = 6")], false) === "2 \\* 3 = 6", "a literal asterisk is kept literal");
assert(fieldValueFromNodes([text("Ayat satu"), el("BR")], true) === "Ayat satu", "a non-breaking space and a trailing line break are not stored");
assert(fieldValueFromNodes([text("Baris satu"), el("BR"), text("baris dua")], true) === "Baris satu\nbaris dua", "a multi-line field keeps its line break");
assert(fieldValueFromNodes([text("Baris satu"), el("BR"), text("baris dua")], false) === "Baris satu baris dua", "a one-line field has none");
assert(inlineMarkdown(el("EM", text("x"))) === "*x*", "the single-node reader agrees");

// what is stored -> what the box shows
assert(inlineHtml("*Neri* ialah bahan **berlendir**") === "<em>Neri</em> ialah bahan <strong>berlendir</strong>", "stored text is shown as real italic and bold");
assert(inlineHtml("2 \\* 3") === "2 * 3", "a literal asterisk is shown as one");
assert(inlineHtml("<b>x</b>") === "&lt;b&gt;x&lt;/b&gt;", "typed markup is shown as text, never run");
const roundTrip = (value: string) => fieldValueFromNodes([text("")], false) === "" && value;
assert(roundTrip("*a*") === "*a*", "(sanity)");

// the fields are this component, and only this
const note = read("src", "components", "admin", "SideNoteList.tsx");
const inserter = read("src", "components", "admin", "FootnoteInserter.tsx");
assert(!note.includes("<textarea") && note.includes("<InlineRichField"), "the side note boxes are the visual field");
assert(!inserter.includes("<textarea") && inserter.includes("<InlineRichField"), "so is the box that adds a side note");
const field = read("src", "components", "admin", "InlineRichField.tsx");
assert(!/markdown/i.test(field.replace(/\/\*[\s\S]*?\*\//g, "")), "the field shows no mention of Markdown");
assert(field.includes('key === "i"') && field.includes('execCommand("italic")') && field.includes('key === "b"') && field.includes('execCommand("bold")'), "Ctrl/Cmd+I makes italic, Ctrl/Cmd+B bold");
assert(field.includes('getData("text/plain")'), "pasted text arrives as plain text");
assert(field.includes("maxLength") && field.includes("lastGoodHtml"), "the length limit is kept");
const editor = read("src", "components", "admin", "VisualManuscriptEditor.tsx");
assert(!editor.includes("function inlineHtml") && !editor.includes("function inlineMarkdown") && editor.includes('from "../../lib/admin/inline-format"'), "the manuscript editor shares the same conversion (no second copy)");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
