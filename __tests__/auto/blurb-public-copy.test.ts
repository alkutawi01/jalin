/** The reader-facing sentences say "blurb", not "ringkasan", for the line under a title. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");
assert(read("src", "app", "mula", "page.tsx").includes("Senarai karya, tajuk dan blurb boleh dilihat oleh sesiapa"), "Mula says blurb");
assert(read("src", "app", "terma", "page.tsx").includes("Senarai karya, tajuk dan blurb boleh dilihat oleh sesiapa"), "Terma says blurb");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
