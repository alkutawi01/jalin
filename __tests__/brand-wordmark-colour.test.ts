/** The header wordmark is drawn in the brand ink green (#132f38, as the mono variants), not a near-black navy. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const svg = fs.readFileSync(path.join(__dirname, "..", "public", "brand", "jalin-wordmark.svg"), "utf8");
const fills = Array.from(svg.matchAll(/fill="([^"]*)"/g), (m) => m[1]);
assert(fills.length > 0, "the wordmark has filled shapes");
assert(fills.filter((f) => f !== "rgb(251,251,251)").every((f) => f === "rgb(19,47,56)"), "every letter shape uses the brand ink green rgb(19,47,56) (#132f38)");
assert(!/rgb\(0,\s*(9|31),\s*(14|46)\)/.test(svg), "the near-black navy fills are gone");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
