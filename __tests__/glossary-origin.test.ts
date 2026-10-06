/**
 * Glossary pronunciation and original spelling (migration 023), and italics on the Watak and Latar cards.
 *  1. the chatbot answer carries Sebutan / Bahasa asal / Ejaan asal through the glossary parser and the labelled parser
 *  2. the reader glossary keeps them (language only with a spelling) and the tooltip shows them
 *  3. the cards for characters, places and times render *italic* marks, on wide and narrow screens
 *  4. the database columns, the API, the frozen version and the editor form know the new fields
 */
import fs from "node:fs";
import path from "node:path";
import { parseGlossaryPaste, buildGlossaryPrompt } from "../src/lib/admin/authoring/glossary-paste";
import { parseLabelledAnswer } from "../src/lib/admin/authoring/labelled-output";
import { buildVerifiedGlossary } from "../src/lib/reader/verified-glossary";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

console.log("\n=== Glossary paste ===");
const body = "Mudif itu dibina daripada qasab. Mereka minum teh.";
const answer = `[GLOSARI]
Istilah: mudif
Maksud: Bangunan besar melengkung daripada reed.
Asing: reed
Sebutan: mu-dif
Bahasa asal: Arab
Ejaan asal: مضيف
____
Istilah: qasab
Maksud: Reed besar.
Sebutan: tidak dinyatakan
`;
const pasted = parseGlossaryPaste(answer, body, []);
const mudif = pasted.items.find((i) => i.term === "mudif");
const qasab = pasted.items.find((i) => i.term === "qasab");
assert(mudif?.pronunciation === "mu-dif" && mudif?.original === "مضيف" && mudif?.originalLanguage === "Arab", "pronunciation, original spelling and language are read", mudif);
assert(mudif?.meaning.includes("*reed*"), "the Asing line still italicises foreign words in the meaning", mudif);
assert(qasab !== undefined && qasab.pronunciation === undefined && qasab.original === undefined, "'tidak dinyatakan' and missing lines leave the fields empty", qasab);
assert(!parseGlossaryPaste("Istilah: mudif\nMaksud: Bangunan.\nBahasa asal: Arab", body, []).items[0]?.originalLanguage, "a language without a spelling is dropped");
const prompt = buildGlossaryPrompt({ type: "cerpen", body, existingTerms: [] });
assert(prompt.includes("Sebutan:") && prompt.includes("Ejaan asal:") && prompt.includes("Jangan meneka"), "the prompt asks for them as optional, never guessed");

console.log("\n=== Labelled answer (Tambah Karya) ===");
const labelled = parseLabelledAnswer(`[KARYA]
Jenis: cerpen
Tajuk: Ujian
____
[GLOSARI]
Istilah: mudif
Maksud: Bangunan melengkung.
Sebutan: mu-dif
Bahasa asal: Arab
Ejaan asal: مضيف
`);
const raw = labelled?.raw as { glossary?: Array<Record<string, string>> } | undefined;
assert(raw?.glossary?.[0]?.pronunciation === "mu-dif" && raw?.glossary?.[0]?.original === "مضيف" && raw?.glossary?.[0]?.originalLanguage === "Arab", "the labelled parser carries the three fields", raw?.glossary);

console.log("\n=== Reader glossary ===");
const built = buildVerifiedGlossary({
  glossary: [
    { term: "*mudif*", meaning: "bangunan melengkung", pronunciation: " mu-dif ", original: "مضيف", originalLanguage: "Arab" },
    { term: "ceruk", meaning: "sudut kecil", originalLanguage: "Arab" },
    { term: "buritan", meaning: "belakang perahu" }
  ]
});
assert(built["mudif"]?.pronunciation === "mu-dif" && built["mudif"]?.original === "مضيف" && built["mudif"]?.originalLanguage === "Arab" && built["mudif"]?.termDisplay === "*mudif*", "pronunciation and spelling reach the reader entry; the italic display term is kept", built["mudif"]);
assert(built["ceruk"]?.originalLanguage === undefined && built["buritan"]?.pronunciation === undefined, "a language alone, or nothing, adds nothing");
const tooltip = read("src/components/reader/GlossaryTerm.tsx");
assert(tooltip.includes("stripItalicMarks") && tooltip.includes(".map(stripItalicMarks)"), "screen readers never hear the asterisks");
assert(tooltip.includes("Sebutan:") && tooltip.includes("glossary-original") && tooltip.includes('dir="auto"'), "the tooltip shows pronunciation and original spelling (right-to-left safe)");
assert(read("src/components/reader/StoryMarkdown.tsx").includes("pronunciation={glossary[key].pronunciation}"), "the story passes them to the tooltip");

console.log("\n=== Cards render italics ===");
const rail = read("src/components/reader/StoryChrome.tsx");
const mobile = read("src/components/reader/MobileStoryInfo.tsx");
for (const [name, source] of [["wide screen", rail], ["phone", mobile]] as const) {
  assert(source.includes("renderItalics(place.name)") && source.includes("renderItalics(place.description)") && source.includes("renderItalics(character.name)") && source.includes("renderItalics(time.name)"), `${name}: place, character and time cards render *italic* marks`);
}

console.log("\n=== Storage and editor ===");
const migration = read("src/lib/db/migrations/023_glossary_pronunciation_original.ts");
assert(["pronunciation", "original_text", "original_language"].every((c) => migration.includes(`"${c}"`)) && migration.includes("information_schema.columns"), "migration 023 adds the three columns, guarded per column");
const service = read("src/lib/admin/glossary-service.ts");
assert(service.includes("input.pronunciation?.trim() ?") && service.includes("original_text: input.originalText"), "a term without them is written without the new columns, so an unmigrated database still works");
assert(read("src/app/api/admin/glossary/route.ts").includes("originalText") && read("src/app/api/admin/glossary/[id]/route.ts").includes("originalLanguage"), "the glossary API accepts them");
assert(read("src/lib/admin/revision-service.ts").includes("original_text") && read("src/lib/content/database-repository.ts").includes("originalLanguage"), "the frozen version stores and reads them, and the hash only changes once they are set");
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes("Cara sebut") && page.includes("Bahasa asal") && page.includes("Ejaan asal"), "the glossary form has the three fields");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
