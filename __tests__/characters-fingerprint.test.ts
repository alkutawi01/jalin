/** A change to the character list counts as an unpublished change, without disturbing works that never had characters. */
import { charactersFingerprint } from "../src/lib/admin/revision-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const a = { characters: [{ name: "Alia", role: "Penyelidik", firstAppearanceSection: "bab-1" }] };
assert(charactersFingerprint(undefined) === "" && charactersFingerprint(null) === "" && charactersFingerprint({}) === "", "no characters gives an empty fingerprint");
assert(charactersFingerprint({ characters: [] }) === "", "an empty list gives an empty fingerprint (same as never having had any)");
assert(charactersFingerprint(a) === charactersFingerprint(JSON.parse(JSON.stringify(a))), "the same list gives the same fingerprint");
assert(charactersFingerprint(JSON.stringify(a)) === charactersFingerprint(a), "metadata stored as a JSON string is read the same");
assert(charactersFingerprint(a) !== charactersFingerprint({ characters: [...a.characters, { name: "AIDEN", role: "Sistem" }] }), "adding a character changes it");
assert(charactersFingerprint(a) !== charactersFingerprint({ characters: [{ ...a.characters[0]!, role: "Pensyarah" }] }), "changing a role changes it");
assert(charactersFingerprint(a) !== charactersFingerprint({ characters: [{ ...a.characters[0]!, firstAppearanceSection: "bab-2" }] }), "changing the chapter where a character first appears changes it");
assert(charactersFingerprint("not json") === "", "unreadable metadata does not throw");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
