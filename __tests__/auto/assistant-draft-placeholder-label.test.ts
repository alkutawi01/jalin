/** The "Isi borang" summary does not call a new draft's stand-in title and address "existing values": nobody has written them yet. */
import fs from "node:fs";
import path from "node:path";
import { isDraftPlaceholder } from "../../src/lib/admin/authoring/editor-assistant";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
assert(isDraftPlaceholder({ key: "title", before: "Draf tanpa tajuk" }), "the generated title is a placeholder");
assert(isDraftPlaceholder({ key: "slug", before: "draf-1791555842903-6vmq9p" }), "the generated address is a placeholder");
assert(!isDraftPlaceholder({ key: "title", before: "Simpul" }), "a real title is an existing value");
assert(!isDraftPlaceholder({ key: "slug", before: "simpul" }), "a real address is an existing value");
assert(!isDraftPlaceholder({ key: "body", before: "Draf tanpa tajuk" }), "only the title and address keys count");
const src = fs.readFileSync(path.join(__dirname, "..", "..", "src", "components", "admin", "EditorAssistant.tsx"), "utf8");
assert(src.includes("Nilai sementara draf akan diganti"), "the summary says so for a placeholder");
assert(src.includes("Nilai sedia ada akan diganti"), "and keeps the old wording for real values");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
