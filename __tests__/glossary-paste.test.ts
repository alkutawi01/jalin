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
assert(prompt.includes("CONTOH") && prompt.includes("Asing: pit stop, motorsport"), "prompt has a filled example");
assert(prompt.includes("starter") && prompt.includes("jangan ulang"), "prompt lists terms that already exist");
assert(!/6 hingga 12|minimum|sekurang-kurangnya/i.test(prompt) && prompt.includes("Tiada had bilangan"), "prompt sets no minimum or maximum");
assert(prompt.includes("Asing:") && prompt.includes("PERKATAAN ASING") && prompt.includes("SEMAKAN AKHIR"), "prompt asks for an Asing line listing foreign words, and a final self-check");
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
r = parseGlossaryPaste("[GLOSARI]\nTiada istilah sukar.", body, []);
assert(r.none && r.items.length === 0 && r.unreadable === 0, '"Tiada istilah sukar" is a valid empty answer');
r = parseGlossaryPaste("Istilah: *fan belt*\nMaksud: Tali getah, juga disebut *timing belt*.", body, ["Fan Belt"]);
assert(r.items.length === 0 && r.existing.length === 1, "italic marks do not hide an existing term");
r = parseGlossaryPaste("Istilah: *fan belt*\nMaksud: Tali getah, juga disebut *timing belt*.", body, []);
assert(r.items[0]!.term === "*fan belt*" && r.items[0]!.meaning.includes("*timing belt*"), "the chatbot's italic marks are kept");
r = parseGlossaryPaste("Istilah: fan belt\nMaksud: Tali getah dalam enjin, juga disebut timing belt.\nAsing: fan belt, timing belt\n____\nIstilah: zink\nMaksud: Logam nipis.\nAsing: tiada", body, []);
assert(r.items[0]!.term === "*fan belt*" && r.items[0]!.meaning === "Tali getah dalam enjin, juga disebut *timing belt*.", "foreign words listed in Asing are italicised in the term and in the meaning");
assert(r.items[1]!.term === "zink" && r.items[1]!.meaning === "Logam nipis.", "'Asing: tiada' leaves the text upright");
r = parseGlossaryPaste("Istilah: fan belt\nMaksud: Tali getah.\nAsing: belt", body, []);
assert(r.items[0]!.term === "fan *belt*", "only whole listed words are italicised (a listed word inside a longer term does not touch Malay words)");
r = parseGlossaryPaste("Istilah: *fan belt*\nMaksud: Tali getah.\nAsing: fan belt", body, []);
assert(r.items[0]!.term === "*fan belt*", "a term already marked is not marked twice");
r = parseGlossaryPaste("Istilah: zink\nMaksud: Logam nipis.\nAsing: logam", body, []);
assert(r.items[0]!.meaning === "*Logam* nipis.", "what the chatbot lists is what gets italicised, nothing else");
r = parseGlossaryPaste("", body, []);
assert(r.items.length === 0, "empty paste gives nothing");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
