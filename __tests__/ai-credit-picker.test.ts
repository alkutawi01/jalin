/**
 * The credit form listed only the AIs that already had a pseudonym in Tetapan, so an AI without one (Gemini) silently did not exist and the
 * editor could not tell why. Every AI is listed now; one without a pseudonym is greyed out and says so, with the way to set it.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const tsx = fs.readFileSync(path.join(__dirname, "../src/components/admin/AiCreditPicker.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(tsx.includes("setPersonas(data.personas as Persona[])") && !tsx.includes("filter((p) => p.slug)))"), "every AI is kept, not only those with a pseudonym");
assert(tsx.includes("disabled={!p.slug}") && tsx.includes("(belum ada nama samaran)"), "one without a pseudonym is listed, disabled and labelled");
assert(tsx.includes('/admin/settings#nama-samaran') && tsx.includes("tetapkan namanya di"), "and the way to set it is shown");
assert(tsx.includes("const ready = personas.filter((p) => p.slug)") && tsx.includes("if (ready.length === 0)"), "the 'set pseudonyms first' hint still shows when none has one");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
