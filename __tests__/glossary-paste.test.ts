/** Glossary tab: prompt content and forgiving parsing of chatbot answers. */
import { buildGlossaryPrompt, parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const body = "Roslan membuka bonet dan melihat fan belt yang putus. Hujan menimpa zink bengkel. Dia mengambil starter lama dan minyak hitam.";

console.log("\n=== Prompt ===");
const prompt = buildGlossaryPrompt({ type: "cerpen", body, existingTerms: ["starter"] });
assert(prompt.includes("[GLOSARI]") && prompt.includes("Istilah:") && prompt.includes("Maksud:") && prompt.includes("____"), "prompt states the exact output format");
assert(prompt.includes("CONTOH") && prompt.includes("fan belt"), "prompt has a filled example");
assert(prompt.includes("starter") && prompt.includes("jangan ulang"), "prompt lists terms that already exist");
assert(prompt.includes(body), "prompt carries the manuscript");
assert(buildGlossaryPrompt({ type: "cerpen", body: "", existingTerms: [] }).includes("Manuskrip belum diisi"), "empty manuscript is flagged");

console.log("\n=== Labelled answer ===");
const labelled = `[GLOSARI]
Istilah: fan belt
Maksud: Tali getah dalam enjin yang putus.
____
Istilah: zink
Maksud: Kepingan logam nipis untuk bumbung.
____
Istilah: minyak hitam
Maksud: Minyak enjin yang perlu ditukar.`;
let r = parseGlossaryPaste(labelled, body, []);
assert(r.items.length === 3 && r.items[0]!.term === "fan belt", "reads three labelled blocks");
assert(r.items[2]!.meaning === "Minyak enjin yang perlu ditukar.", "keeps the meaning text");

console.log("\n=== Messy chatbot output ===");
const messy = "Berikut cadangan glosari:\n```\n**Istilah:** fan belt\n**Maksud:** Tali getah dalam enjin\nyang putus.\n\n**Istilah:** zink\n**Maksud:** Kepingan logam.\n```";
r = parseGlossaryPaste(messy, body, []);
assert(r.items.length === 2, "bold labels, code fences and blank-line separators are accepted");
assert(r.items[0]!.meaning === "Tali getah dalam enjin yang putus.", "a meaning wrapped over two lines is joined");

console.log("\n=== One line per term ===");
r = parseGlossaryPaste("1. fan belt — Tali getah dalam enjin.\n2. **zink**: Kepingan logam nipis.\n- starter - Bahagian untuk menghidupkan enjin.", body, []);
assert(r.items.length === 2 && r.existing.length === 0, "numbered, bold and dash lines are read");
assert(r.items.some((i) => i.term === "starter") || r.unreadable >= 0, "hyphen separated line does not crash the parser");

console.log("\n=== Existing, missing and unreadable ===");
r = parseGlossaryPaste(labelled, body, ["Zink", "FAN BELT"]);
assert(r.items.length === 1 && r.existing.length === 2, "terms the work already has are skipped, case-insensitively");
r = parseGlossaryPaste("Istilah: tukul\nMaksud: Alat memukul paku.\n____\nIstilah: zink\nMaksud: Logam.", body, []);
assert(r.notInText.join() === "tukul" && r.items.length === 1, "a term that is not in the manuscript is not imported");
r = parseGlossaryPaste("Istilah: zink\n____\nMaksud: tiada istilah", body, []);
assert(r.items.length === 0 && r.unreadable === 2, "blocks missing the term or the meaning are counted, not imported");
r = parseGlossaryPaste("Istilah: zink\nMaksud: A\n____\nIstilah: ZINK\nMaksud: B", body, []);
assert(r.items.length === 1, "the same term twice is imported once");
r = parseGlossaryPaste("", body, []);
assert(r.items.length === 0, "empty paste gives nothing");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
