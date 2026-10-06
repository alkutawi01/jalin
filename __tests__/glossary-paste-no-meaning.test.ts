/** A glossary answer with "Maksud: Tidak dinyatakan" must not add a term whose meaning is "Tidak dinyatakan". */
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const body = "Pelita dan sumbu dan bakul.";
const labelled = parseGlossaryPaste("Istilah: sumbu\nMaksud: Tidak dinyatakan\n\nIstilah: pelita\nMaksud: lampu minyak", body, []);
assert(labelled.items.length === 1 && labelled.items[0]!.term === "pelita", "a labelled term without a known meaning is not added");
assert(labelled.unreadable === 1, "and is counted as unreadable so the editor is told");
const oneLine = parseGlossaryPaste("sumbu — tidak dinyatakan\npelita — lampu minyak\nbakul: tiada", body, []);
assert(oneLine.items.length === 1 && oneLine.items[0]!.term === "pelita", "one-line forms too");
assert(parseGlossaryPaste("Istilah: bakul\nMaksud: tempat menyimpan", body, []).items.length === 1, "a real meaning is still added");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
