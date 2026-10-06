/** A chatbot that answers "Tidak dinyatakan" for an unknown value (the word the Tambah Karya prompts teach it) must leave the field empty. */
import { parseWorkFill } from "../src/lib/admin/authoring/work-fill";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const r = parseWorkFill("[MAKLUMAT]\nDek: Tidak dinyatakan\nGenre: tidak dinyatakan.\n\n[WATAK]\nNama: Aminah\nPeranan: Tidak diketahui\n\nNama: Salmah\nPeranan: Ibu\n\n[LATAR]\nJenis: tempat\nNama: Tidak dinyatakan\nKeterangan: x\n\nJenis: masa\nNama: 1969\nKeterangan: Tidak dinyatakan");
assert(r.dek === "" && r.genre === "", "dek and genre 'tidak dinyatakan' are empty");
assert(r.characters.length === 1 && r.characters[0]!.name === "Salmah", "a character with an unknown role is not added; a complete one is");
assert(r.places.length === 0 && r.times.length === 1 && r.times[0]!.description === "", "a place named 'tidak dinyatakan' is dropped; an unknown note is empty");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
