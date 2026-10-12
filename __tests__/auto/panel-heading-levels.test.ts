/** The Penilaian AI panel goes h1 > h2: its section titles are not h3 under an h1, and keep their small sans look. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const root = path.join(__dirname, "..", "..", "src", "app", "admin");
for (const rel of ["panel/page.tsx", "panel/[kind]/[id]/page.tsx"]) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  assert(/<h1[ >]/.test(src), `${rel}: has the h1`);
  assert(!/<h3[ >]/.test(src), `${rel}: no h3 straight under the h1`);
  assert(/<h2>/.test(src), `${rel}: section titles are h2`);
}
const css = fs.readFileSync(path.join(root, "admin.css"), "utf8");
assert(/\.a-shell \.admin-panel-ai h2 \{[^}]*font-size: 16px/.test(css), "the h2 keeps the 16px size the h3 had");
assert(/\.a-shell \.admin-panel-ai h2 \{[^}]*font-family: var\(--a-font\)/.test(css), "and the sans font, not the serif of the page title");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
