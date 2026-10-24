/** Audit 19-20 Okt, kumpulan 2: limits that can be undone, notes without leaked syntax, search passages, glossary save. */
import fs from "node:fs";
import path from "node:path";
import { shortenNoteLinks } from "../../src/lib/reader/note-links";
import { noteMarkdown } from "../../src/lib/reader/note-text";
import { readable } from "../../src/lib/reader/search";
import { glossaryTermsMissingFromText } from "../../src/lib/admin/glossary-check";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

// Notes: links written on purpose are not broken, the rest is shortened.
assert(shortenNoteLinks("[https://lmu.de/a](https://lmu.de/a)") === "[https://lmu.de/a](https://lmu.de/a)", "a link whose text is its address is not wrapped twice");
assert(shortenNoteLinks("Lihat <https://lmu.de/a> di sini") === "Lihat <https://lmu.de/a> di sini", "an autolink in angle brackets is left alone");
assert(shortenNoteLinks("[1]: https://lmu.de/a/b\nTeks https://x.org/z.") === "[1]: https://lmu.de/a/b\nTeks [x.org](https://x.org/z).", "a reference definition line stays, the next line is still shortened");
assert(shortenNoteLinks("(https://www.lmu.de/en/about)") === "([lmu.de](https://www.lmu.de/en/about))", "a bracketed address still shortens");
const typed = noteMarkdown('Kata "tepat" dan sumber—lain');
assert(typed.includes("“") && typed.includes("”") && typed.includes("sumber — lain"), "a note gets the curved quotes and the spaced dash of the story");

// Search passages show what a reader sees.
const passage = readable("Awal [[gambar:2]]\n:::emel\nIsi\n:::\n---\nBaca [laman](https://x.org/panjang/sangat) dan ![rajah](a.png) > petikan");
assert(!/gambar|:::|---|https?:|\]\(|!\[/.test(passage) && passage.includes("laman") && passage.includes("Isi"), "no image marker, fence, rule or address in a passage (the link text stays)");

// A glossary term set in italic is checked as the reader sees it.
assert(glossaryTermsMissingFromText(["*kampung*"], "Dia pulang ke kampung itu.").length === 0, "an italic term is found in the text");

// Source checks.
const field = read("src", "components", "admin", "InlineRichField.tsx");
assert(/next\.length > maxLength && next\.length > lastLength\.current/.test(field), "a value over the limit can still be shortened; only growth is refused");
assert(field.includes('role="status"') && field.includes("Had {maxLength} aksara dicapai"), "a refused keystroke or paste says so");
assert(read("src", "components", "admin", "FootnoteInserter.tsx").includes('e.key === "Escape" && !text.trim() && close()'), "Escape does not throw away a typed side note");
assert(read("src", "components", "admin", "SideNoteList.tsx").includes("renderItalics(item.text)"), "an unnumbered note shows its italics, not asterisks");
const page = read("src", "app", "admin", "works", "[id]", "page.tsx");
assert(page.includes("if (!editingGlossary || glossaryBusy) return;") && page.includes("disabled={glossaryBusy}\n                >\n                  Simpan istilah"), "a double click on Simpan istilah sends one request");
assert(!page.includes("aria-label={`Padam istilah ${term.term}`}"), "a screen reader is not read the asterisks of a term");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
