/** A glossary term that ends in an apostrophe (Arabic transliteration: tasmi', mushaf-style words) keeps it when pasted from a chatbot answer. */
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

const body = "Sebelum sesi tasmi' bersama Ustazah, dan mushaf berkulit krim.";
const answer = "[GLOSARI]\nIstilah: tasmi'\nMaksud: Sesi memperdengarkan bacaan kepada guru.\nAsing: tiada.\n____\nIstilah: 'mushaf'\nMaksud: Naskhah al-Quran dalam bentuk buku.\nAsing: tiada.";
const items = parseGlossaryPaste(answer, body, []).items;
assert(items.some((item) => item.term === "tasmi'"), "tasmi' keeps its apostrophe", items.map((item) => item.term));
assert(items.some((item) => item.term === "mushaf"), "a value wrapped in quotes loses them", items.map((item) => item.term));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
