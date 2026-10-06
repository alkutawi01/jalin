/** A character listed twice in the chatbot's answer (or the answer pasted twice) is one character; the editor's save refuses duplicates. */
import { buildImportPlan } from "../src/lib/admin/import/plan";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const answer = ["[KARYA]","Jenis: cerpen","Tajuk: Pelita","Slug: pelita","Dek: Satu dek.","Genre: drama","Penulis: tidak dinyatakan","Anggaran bacaan: 2","","[WATAK]","Nama: Aminah","Peranan: Ibu","Penerangan: A.","","Nama: AMINAH","Peranan: Kakak","Penerangan: B.","","Nama: Salmah","Peranan: Jiran","Penerangan: C."].join("\n");
const text = "Aminah dan Salmah menyalakan pelita.";
const r = buildImportPlan(answer, text, { expectedType: "cerpen" } as never) as { plan?: { characters: { name: string; role: string }[] } };
assert(r.plan?.characters.map((c) => c.name).join("|") === "Aminah|Salmah" && r.plan?.characters[0]?.role === "Ibu", "the repeated character is kept once, first mention wins");
const edited = buildImportPlan(answer, text, { expectedType: "cerpen", edits: { characters: [{ name: "Aminah", role: "Ibu" }, { name: "aminah", role: "X" }, { name: "Salmah", role: "Jiran" }] } } as never) as { plan?: { characters: { name: string }[] } };
assert(edited.plan?.characters.length === 2, "and the review screen's edits are deduplicated too");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
