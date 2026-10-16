/** The Watak & latar tab: every field and the delete button of a row has a name a screen reader can say, not just a placeholder. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "..", "..", "src", "app", "admin", "works", "[id]", "page.tsx"), "utf8");
const at = src.indexOf("characters.map((character, index)");
const block = at >= 0 ? src.slice(at, src.indexOf("</tbody>", at)) : "";

assert(at > 0, "found the character rows");
assert(block.includes("ariaLabel={`Nama watak ${index + 1}`}"), "the name field is labelled with its row");
assert(block.includes("ariaLabel={`Peranan watak ${index + 1}`}"), "the role field is labelled with its row");
assert(block.includes("aria-label={`Kemunculan pertama watak ${index + 1}`}"), "the first-appearance field is labelled with its row");
assert(/aria-label=\{`Padam watak \$\{[^}]*\}`\}/.test(block), "each delete button says whom it deletes");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
