/** Small weaknesses from the simulation: an empty draft is not sent for review, and every Padam says what it deletes. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");
const panel = read("src", "components", "admin", "WorkStatusPanel.tsx");
assert((panel.match(/disabled: untouched, hint: untouched \? "Taip tajuk dan teks dahulu."/g) ?? []).length === 2, "an empty draft cannot be sent for review (owner and editor alike)");
const page = read("src", "app", "admin", "works", "[id]", "page.tsx");
assert(page.includes("aria-label={`Padam bab ${") && page.includes("aria-label={`Padam kredit ${") && page.includes("aria-label={`Padam istilah ${"), "chapter, credit and glossary deletes say what they delete");
assert(page.includes('aria-label="Padam karya ini selama-lamanya"') && page.includes("            Padam karya\n"), "deleting the work is named as such, in words and to a screen reader");
assert(read("src", "components", "admin", "SideNoteList.tsx").includes("aria-label={`Padam nota tanpa nombor ${item.label}`}"), "a footnote delete says which note");
assert(read("src", "components", "admin", "PlacesEditor.tsx").includes("aria-label={`Padam ${cfg.noun} ${place.name"), "a place delete says which place");
assert(!read("src", "lib", "admin", "publication-readiness.ts").includes("provenance_expected"), "the empty 'butiran sumber disemak melalui semakan hak' warning is gone");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
