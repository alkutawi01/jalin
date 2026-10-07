/**
 * Fixes from the sinopsis simulation (6 Okt 2026, Anne dari Green Gables):
 *  1. the Magnific/Mock generator picker defaults to Magnific, not Mock (Test)
 *  2. a network hiccup while polling does not end the visual request as "failed"
 *  3. the AI instruction does not say Jalin is only for readers aged 13 to 17
 *  4. a glossary term that does not appear in the text as a whole word is reported (with the word the text does use)
 * (The "## " heading fix is tested in manuscript-import.test.ts.)
 */
import fs from "node:fs";
import path from "node:path";
import { isTransientVisualError } from "../src/lib/admin/visual-generation/adapter";
import { glossaryTermsMissingFromText } from "../src/lib/admin/glossary-check";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

// 1. generator default
const vrPage = read("src/app/admin/visual-requests/[id]/page.tsx");
assert(vrPage.includes('useState("magnific")') && !vrPage.includes('setGenProvider] = useState("mock")'), "the generator picker starts on Magnific, so Generate does not silently make a test image");

// 2. transient poll errors
const withCause = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
assert(isTransientVisualError(new TypeError("fetch failed")) && isTransientVisualError(withCause), "'fetch failed' and a reset connection are transient");
assert(isTransientVisualError(new Error("request timed out")) && isTransientVisualError(new Error("Magnific 503 service unavailable")) && isTransientVisualError(new Error("429 rate limit")), "timeouts, 503 and rate limits are transient");
assert(!isTransientVisualError(new Error("401 unauthorized: bad api key")) && !isTransientVisualError(new Error("400 invalid prompt")) && !isTransientVisualError("fetch failed"), "an answer from the provider that something is wrong (auth, invalid input) is not transient");
const service = read("src/lib/admin/visual-generation/visual-generation-service.ts");
assert(/if \(isTransientVisualError\(error\)\) \{[\s\S]{0,900}status: "poll_unreachable"[\s\S]{0,900}return \{\s*\.\.\.mapRecordToResult\(vr\)/.test(service), "polling keeps the request running and records the unreachable poll instead of calling failVisualGeneration");

// 3. audience wording in the AI instruction
const prompts = read("src/lib/admin/authoring/default-prompts.ts");
assert(!/untuk pembaca remaja 13 hingga 17 tahun\./.test(prompts) && /untuk pembaca semua peringkat umur\./.test(prompts) && !/sasaran utama/.test(prompts), "the instruction says Jalin is for all ages, teens being the main audience");

// 4. glossary terms must occur as whole words
const text = "Marilla kehilangan kerongsang ametisnya yang amat dihargai. Beg lusuh itu anggun.";
const problems = glossaryTermsMissingFromText(["ametis", "lusuh", "anggun", "  ", "Lusuh"], text);
assert(problems.length === 1 && problems[0]!.term === "ametis" && problems[0]!.suggestion === "ametisnya", "'ametis' is reported, with 'ametisnya' (the form in the text) as the suggestion", problems);
assert(glossaryTermsMissingFromText(["hantu"], text)[0]?.suggestion === null, "a term with no longer form in the text is reported without a suggestion");
assert(read("src/components/admin/AuthoringForm.tsx").includes("glossaryTermsMissingFromText(review.glossary.map((g) => g.term), material)"), "the review step checks the pasted text");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
