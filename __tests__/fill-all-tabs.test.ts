/** Fill-all-tabs: one prompt for a work that already has its text, one answer applied to every tab. */
import { composeAiPrompt } from "../src/lib/admin/authoring/compose-prompt";
import { DEFAULT_GLOBAL_RULES } from "../src/lib/admin/authoring/default-prompts";
import { composeVisualPrompt } from "../src/lib/admin/visual-generation/prompt-composer";
import { readParserAnswer } from "../src/lib/admin/import/parser-output";
import { buildImportPlan } from "../src/lib/admin/import/plan";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("\n=== One prompt for the whole work ===");
const prompt = composeAiPrompt({
  recipe: "novela.data",
  omitSections: ["BAB", "KANDUNGAN", "SIRI"],
  material: "Bahagian [BAB] tidak diperlukan.\n\nTEKS KARYA\nBab satu bermula di sini."
});
assert(prompt.includes("[GLOSARI]") && prompt.includes("[WATAK]") && prompt.includes("[GAMBAR]") && prompt.includes("[KARYA]"), "asks for details, glossary, characters and images");
assert(!prompt.includes("[KANDUNGAN]"), "never asks for the work's text");
assert(prompt.includes("Bab satu bermula di sini."), "carries the work's text and what the work already has");
assert(prompt.includes("Asing:") && !/sehingga 8/i.test(prompt), "glossary format has the Asing line and no cap");
assert(DEFAULT_GLOBAL_RULES.includes("Tiada had bilangan") && DEFAULT_GLOBAL_RULES.includes("Tiada istilah sukar"), "default rules: no quota, an empty glossary is valid");

console.log("\n=== Jalin standards travel with every image prompt ===");
const image = composeVisualPrompt({ sceneInstruction: "A man at a workshop door.", role: "inline", aspectRatio: "4:3", workTitle: "Ujian", workType: "cerpen" });
assert(/no human face is clearly visible/i.test(image.finalPrompt), "faces are protected even if the chatbot said nothing about faces");
assert(/Scene truth/.test(image.finalPrompt) && /Anatomy/.test(image.finalPrompt) && /Continuity/.test(image.finalPrompt), "scene truth, anatomy and continuity rules are added");
assert(image.finalPrompt.includes("Soft cinematic editorial illustration") && image.finalPrompt.includes("A man at a workshop door."), "house style and the chatbot's scene are both present");

console.log("\n=== Asing line is read and applied ===");
const answer = `[KARYA]
Jenis: cerpen
Tajuk: Ujian
Slug: ujian

[GLOSARI]
Istilah: fan belt
Maksud: Tali getah dalam enjin, juga disebut timing belt.
Asing: fan belt, timing belt
____
Istilah: zink
Maksud: Logam nipis.
Asing: tiada`;
const parsed = readParserAnswer(answer, { title: "Ujian", slug: "ujian" });
assert(!!parsed.data && parsed.data.glossary.length === 2, "glossary blocks are read");
assert(parsed.data?.glossary[0]?.foreign.join() === "fan belt,timing belt" && parsed.data?.glossary[1]?.foreign.length === 0, "Asing words are kept; 'tiada' means none");
const plan = buildImportPlan(answer, "Roslan melihat fan belt yang putus.\n\nHujan menimpa zink bengkel.", { mode: "data" });
assert(plan.plan?.glossary[0]?.term === "*fan belt*" && plan.plan?.glossary[0]?.meaning.includes("*timing belt*"), "a new import also italicises exactly the listed foreign words");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
