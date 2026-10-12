/** A slide that is hidden from a screen reader must not take keyboard focus either: aria-hidden alone leaves its links tabbable. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const dir = path.join(__dirname, "..", "..", "src", "components", "reader");
for (const file of ["SeriesCarousel.tsx", "HeroCarousel.tsx"]) {
  const src = fs.readFileSync(path.join(dir, file), "utf8");
  const tags = src.split("<div").filter((t) => /aria-hidden=\{[^}]*(index|active)[^}]*\}/.test(t.split(">")[0] + (t.split(">")[1] ?? "")));
  assert(tags.length > 0, `${file}: has a slide hidden by aria-hidden`);
  assert(tags.every((t) => /inert=\{/.test(t.slice(0, t.indexOf("\n", t.indexOf("inert=") > -1 ? 0 : 400) + 400))), `${file}: each such slide is also inert`);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
