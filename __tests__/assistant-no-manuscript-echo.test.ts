/** The AI prompts never ask a chatbot for the manuscript; a copy with trailing backslashes still parses. */
import { buildEditorPrompt } from "../src/lib/admin/authoring/editor-assistant";
import { parseLabelledAnswer } from "../src/lib/admin/authoring/labelled-output";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const ctx = (body: string) => ({ type: "cerpen", title: "T", body }) as never;
const all = buildEditorPrompt("all", ctx("Teks sedia ada."));
assert(!all.includes("[KANDUNGAN]\n") && all.includes("Pulangkan data sahaja"), "all tabs: no [KANDUNGAN] format, data only");
assert(all.includes("[KARYA]") && all.includes("[GLOSARI]") && all.includes("[WATAK]"), "the other sections are still asked for");
assert(!all.includes("Teks: (teks penuh bab)"), "chapter text is not asked for either");
assert(!buildEditorPrompt("all", ctx("")).includes("[KANDUNGAN]\n"), "even with an empty form the manuscript is not asked for");
const content = buildEditorPrompt("content", ctx("Teks."));
assert(!content.includes("[KANDUNGAN]\n") && content.includes("Pulangkan hanya Tajuk, Slug dan Blurb"), "the Kandungan tab asks only for title, slug and blurb");

const pasted = "```\\\n[KARYA]\\\nTajuk: Tempat Duduk Baharu\\\nSlug: tempat-duduk-baharu\\\nBlurb: Seorang pelajar.\\\n```";
const r: any = parseLabelledAnswer(pasted);
assert(r?.raw?.slug === "tempat-duduk-baharu" && r?.raw?.title === "Tempat Duduk Baharu", "a copy with a backslash at each line end reads the slug and title");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
