/** "Isi borang" does not fail the whole fill because an address is held by another work: the review says who holds it and offers a free one. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "..", "..", "src", "lib", "admin", "authoring", "editor-answer-service.ts"), "utf8");
assert(src.includes("export async function dropTakenSlug"), "there is a check for a taken address");
assert(src.includes('.where("slug", "=", wanted).where("id", "!=", workId)'), "it looks for another work holding the address");
assert(src.includes("sudah dipakai oleh") && src.includes("Cadangan alamat lain"), "it names the holder and suggests another address");
assert(src.includes("const { changes, notes: slugNotes } = await dropTakenSlug(trx, id, planned);"), "the preview and the apply both use the checked list");
assert(src.includes("notes: [...slugNotes, \"Belum disimpan."), "the preview carries the note to the editor");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
