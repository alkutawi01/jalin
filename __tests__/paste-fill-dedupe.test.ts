/** An answer that names the same character, place or time twice must give one entry each, or saving the list fails with "disenaraikan dua kali". */
import { parseWorkFill } from "../src/lib/admin/authoring/work-fill";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const one = "[WATAK]\nNama: Aminah\nPeranan: Ibu\n\nNama: AMINAH\nPeranan: Kakak\n\n[LATAR]\nJenis: tempat\nNama: KL\nKeterangan: a\n\nJenis: tempat\nNama: kl\nKeterangan: b\n\nJenis: masa\nNama: 1969\nKeterangan: x\n\nJenis: masa\nNama: 1969\nKeterangan: y";
const r = parseWorkFill(one + "\n\n" + one);
assert(r.characters.length === 1 && r.characters[0]!.role === "Ibu", "one character, the first mention");
assert(r.places.length === 1 && r.places[0]!.description === "a" && r.times.length === 1, "one place and one time");
const two = parseWorkFill("[WATAK]\nNama: Aminah\nPeranan: Ibu\n\nNama: Salmah\nPeranan: Jiran");
assert(two.characters.length === 2, "different names are all kept");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
