/** The editor reads Malay field names for source details, never the code's own (originalTitle, translatorName...). */
import fs from "node:fs";
import path from "node:path";
import { SOURCE_FIELDS, SOURCE_FIELD_LABELS, sourceFieldLabel } from "../../src/lib/admin/authoring/editor-assistant";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
assert(Object.keys(SOURCE_FIELDS).every((key) => Boolean(SOURCE_FIELD_LABELS[key])), "every source field has a Malay label");
assert(sourceFieldLabel("originalTitle") === "Tajuk asal" && sourceFieldLabel("translatorName") === "Penterjemah", "the labels read as the form's own");
assert(sourceFieldLabel("unknownKey") === "unknownKey", "an unknown key is shown as it is rather than hidden");
const page = fs.readFileSync(path.join(__dirname, "..", "..", "src", "app", "admin", "works", "[id]", "page.tsx"), "utf8");
assert(page.includes(".map(sourceFieldLabel).join(\", \")"), "the 'Bot sembang mengisi' line uses the labels");
const lib = fs.readFileSync(path.join(__dirname, "..", "..", "src", "lib", "admin", "authoring", "editor-assistant.ts"), "utf8");
assert(lib.includes("`Sumber: ${sourceFieldLabel(key)}`"), "the review list uses the labels");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
