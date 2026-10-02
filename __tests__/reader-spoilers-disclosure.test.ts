/** Reader: characters do not spoil later chapters; the Maya disclosure only appears when it applies. */
import { visibleCharacters } from "../src/lib/reader/visible-characters";
import { disclosureNoteFor, hasVirtualCredit, VIRTUAL_WRITER_NOTE } from "../src/lib/reader/credit-projection";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== Characters by first appearance ===");
const chars = [
  { name: "Alia", role: "Watak utama", firstAppearanceSection: "bab-1" },
  { name: "Rafiq", role: "Rakan", firstAppearanceSection: "bab-3" },
  { name: "Pak Long", role: "Bapa saudara", firstAppearanceSection: null },
  { name: "Hantu", role: "?", firstAppearanceSection: "bab-tiada" }
];
const order = ["bab-1", "bab-2", "bab-3"];
assert(visibleCharacters(chars, order, "bab-1").map((c) => c.name).join() === "Alia,Pak Long,Hantu",
  "chapter 1 hides a character first met in chapter 3");
assert(visibleCharacters(chars, order, "bab-3").map((c) => c.name).join() === "Alia,Rafiq,Pak Long,Hantu",
  "chapter 3 shows characters introduced so far");
assert(visibleCharacters(chars, [], undefined).length === 4, "a work without chapters shows everyone");

console.log("\n=== Maya disclosure per work ===");
const human = [{ slug: "guest:Aina Zulaikha", role: "initial_draft", byline: true }];
const virtual = [{ slug: "nara-zahin", role: "initial_draft", byline: true, displayName: "Nara Zahin", kind: "virtual" as const }];
assert(!hasVirtualCredit(human), "a human-only work has no virtual credit");
assert(disclosureNoteFor({ credits: human }) === undefined, "no disclosure note for a human-only work");
assert(hasVirtualCredit(virtual), "a Maya credit is detected");
assert(disclosureNoteFor({ credits: virtual }) === VIRTUAL_WRITER_NOTE, "disclosure shown when a Maya is credited");
assert(disclosureNoteFor({ credits: human, reader: { note: "Nota khas editor." } }) === "Nota khas editor.", "an editor-written note wins");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
