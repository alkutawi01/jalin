/** Izzat's decisions of 16 Okt on the Jalin UI reports: no automatic inheritance, no 12-place limit, limits told at review, AI names beside pseudonyms. */
import fs from "node:fs";
import path from "node:path";
import { placeEntryProblem } from "../../src/lib/admin/authoring/editor-assistant";
import { validatePlaceEntries } from "../../src/lib/admin/work-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8");

// 12 places are fine; the limit is only a runaway ceiling
assert(validatePlaceEntries(Array.from({ length: 30 }, (_, i) => ({ name: `Tempat ${i}` }))).length === 30, "30 places are accepted");
assert(!read("src/components/admin/PlacesEditor.tsx").includes('? ` Paling banyak ${PLACES_MAX}.`') || read("src/components/admin/PlacesEditor.tsx").includes('kind === "times"'), "the places form no longer states a maximum of 12");

// limits told at the review step
assert(placeEntryProblem({ name: "Beranda", description: "x".repeat(161) })?.includes("161") === true, "a 161-character description is a problem, with its length");
assert(placeEntryProblem({ name: "Beranda", description: "x".repeat(160) }) === undefined, "160 characters is fine");
assert(placeEntryProblem({ name: "n".repeat(81) })?.includes("81") === true, "an 81-character name is a problem");
const assistant = read("src/components/admin/EditorAssistant.tsx");
assert(assistant.includes("change.problem") && assistant.includes("preview.changes.some(change => change.problem)"), "the review shows the problem and holds Isi borang");

// inheritance is the editor's choice
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes("Warisi daripada siri?") && page.includes("/inherit`") && page.includes("jalin-warisan-ditolak"), "the editor is offered the series' details and can accept or decline");
assert(!read("src/app/api/admin/works/start-draft/route.ts").includes("loadSeriesInheritance"), "start-draft copies nothing");

// AI names beside pseudonyms
assert(read("src/components/admin/AiCreditPicker.tsx").includes("`${p.ai} — ${p.displayName}`"), "the credit picker shows the AI and its pseudonym together");
assert(read("src/app/admin/contributors/page.tsx").includes("aiBySlug.get(contributor.slug)"), "the contributor list shows which AI sits behind a pseudonym");

// tab count
assert(page.includes("characters.length + placeTimeCount"), "the Watak & latar number counts characters, places and times");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
