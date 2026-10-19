/** 17 Okt: "Tambah istilah" put the cursor in "Cara sebut"; source notes showed whole web addresses in the margin. */
import fs from "node:fs";
import path from "node:path";
import { shortenNoteLinks } from "../../src/lib/reader/note-links";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

// A form that opens puts the cursor in its FIRST field, and the visual (contenteditable) fields count as fields.
const page = read("src", "app", "admin", "works", "[id]", "page.tsx");
const focusLine = page.split("\n").find((line) => line.includes('form.querySelector<HTMLElement>(') && line.includes(".focus("));
assert(!!focusLine && focusLine.includes("[contenteditable=true]"), "opening a form can put the cursor in a visual field (Istilah), not only in plain inputs");
assert(!!focusLine && focusLine.indexOf("input:not") < focusLine.indexOf("[contenteditable=true]"), "one selector list, so the first field in document order wins");

// Source addresses become short links.
assert(shortenNoteLinks("Sumber (https://www.lmu.de/en/about-lmu/history/index.html); lain") === "Sumber ([lmu.de](https://www.lmu.de/en/about-lmu/history/index.html)); lain", "a bracketed address shows only the site");
assert(shortenNoteLinks("Lihat https://example.org/a/b.") === "Lihat [example.org](https://example.org/a/b).", "a full stop after an address stays outside the link");
assert(shortenNoteLinks("Lihat [laman ini](https://example.org/x) sahaja") === "Lihat [laman ini](https://example.org/x) sahaja", "a link the editor already wrote is left alone");
assert(shortenNoteLinks("Tiada pautan di sini") === "Tiada pautan di sini", "text without an address is unchanged");
assert(shortenNoteLinks("a https://x.com/1 dan http://www.y.org/2").includes("[x.com](https://x.com/1)") && shortenNoteLinks("a https://x.com/1 dan http://www.y.org/2").includes("[y.org](http://www.y.org/2)"), "several addresses in one note");
for (const f of ["FootnoteMargin.tsx", "FootnoteList.tsx"]) {
  assert(read("src", "components", "reader", f).includes("shortenNoteLinks"), `${f} shortens addresses`);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
