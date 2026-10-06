/**
 * A fragmen's text language and a cerpen/novela's "from another source" setting change what readers see, but were in neither the content
 * hash nor the characters fingerprint: changing only one of them looked like "no changes", and "Terbitkan semula" could reuse the old
 * snapshot, so the change never reached readers. They now ride in the fingerprint (only when set, so nothing published looks changed; not the
 * whole metadata, so internal stamps do not make a reader version).
 */
import { charactersFingerprint } from "../src/lib/admin/revision-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const base = { characters: [{ name: "A", role: "x", firstAppearanceSection: "bab-1" }] };
const f = (m: unknown) => charactersFingerprint(m);

assert(f({ ...base, fragmenTextLanguage: "Indonesia" }) !== f(base), "setting the fragmen text language is a change");
assert(f({ ...base, fragmenTextLanguage: "Indonesia" }) !== f({ ...base, fragmenTextLanguage: "Melayu" }), "changing it is a change");
assert(f({ ...base, origin: "sumber" }) !== f(base), "marking a work as from another source is a change");
assert(f({ ...base, origin: "asli" }) === f(base) && f({ ...base, origin: "" }) === f(base), "'asli' or nothing is the same as before");
assert(f({ ...base, fragmenTextLanguage: "  " }) === f(base), "a blank language is the same as none");
assert(f({ ...base, fragmenTextReview: { by: "x" } }) === f(base) && f({ ...base, editorNote: "n" }) === f(base), "internal stamps and other keys do not count");
assert(f(null) === "" && f({}) === "" && f(JSON.stringify(base)) === f(base), "no metadata gives exactly what it gave before; stored text works too");
assert(f({ places: [{ name: "Kota", description: "x" }] }).startsWith("|places:") && f(base).includes('"A"'), "characters and places are unchanged");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
