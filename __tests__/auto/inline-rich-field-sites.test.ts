/** Glossary, characters, places and times are visual-only fields too: no text box where an asterisk has to be typed. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");
const page = read("src", "app", "admin", "works", "[id]", "page.tsx");
const places = read("src", "components", "admin", "PlacesEditor.tsx");

assert(page.includes('labelledBy="glossary-term-label"') && page.includes('labelledBy="glossary-meaning-label"'), "the glossary term and meaning are the visual field");
assert(!page.includes("italicShortcut") && !page.includes("toggleItalicSelection"), "the hidden Ctrl+I shortcut is gone: the field itself does it");
assert(!/atau tulis \*teks\*/.test(page), "no instruction to type asterisks remains");
assert(page.includes("ariaLabel={`Nama watak ${index + 1}`}") && page.includes("ariaLabel={`Peranan watak ${index + 1}`}"), "a character's name and role are the visual field");
assert(places.includes("ariaLabel={`${cfg.nameLabel} ${index + 1}`}") && places.includes("ariaLabel={`Keterangan ${cfg.noun} ${index + 1}`}"), "a place's or time's name and note are the visual field");
// the places editor keeps its limits (80 and 160 characters)
assert(places.includes("maxLength={NAME_MAX}") && places.includes("maxLength={DESCRIPTION_MAX}"), "the length limits stay");
// nothing in these blocks asks for Markdown or an asterisk
for (const [name, src] of [["page", page], ["places", places]] as const) {
  assert(!/<input[^>]*value=\{(character\.name|character\.role|place\.name|place\.description)/.test(src), `${name}: no plain <input> is left for those fields`);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
