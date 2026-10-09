/**
 * An image request shows three steps (Penjanaan, Semakan editorial, Pautan ke karya) side by side. They were three fixed columns, so on a
 * phone (375px) the third was cut off (found on a phone-size look, Oct 2026). They now wrap: side by side while each has 220px.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const css = read("src/app/admin/admin.css");
assert(/\.a-shell \.a-step-panels \{[^}]*repeat\(auto-fit, minmax\(min\(100%, 220px\), 1fr\)\)/.test(css), "the panels wrap by width: auto-fit columns of at least 220px (or the whole row when narrower)");

const page = read("src/app/admin/visual-requests/[id]/page.tsx");
assert(page.includes('<div className="a-step-panels">') && !page.includes('gridTemplateColumns: "1fr 1fr 1fr"'), "the three steps use the wrapping class, not three fixed columns");
assert(["1. Penjanaan", "2. Semakan editorial", "3. Pautan ke karya"].every((t) => page.includes(t)), "all three steps are still there");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
