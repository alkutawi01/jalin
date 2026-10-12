/** The hover line of a link is a curved stroke that sweeps in from the left, not the browser's plain underline. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const i = css.indexOf("--link-stroke:");
const block = css.slice(i);

assert(i > 0 && block.includes("viewBox='0 0 100 8'") && block.includes("Q50 1.4 100 6.2"), "the stroke is a gently curved path");
assert(block.includes("background-size: 0% 8px;") && block.includes("background-size: 100% 8px;"), "it grows from nothing to the full width of the words");
assert(/background-position: 100% 100%;/.test(block) && /background-position: 0% 100%;/.test(block), "it comes in from the left and leaves to the right");
assert(block.includes("box-decoration-break: clone"), "it follows a title across wrapped lines");
for (const sel of [".series-feature-latest-title", ".search-result-title a", ".story-context-line a", ".crumbs a", ".link-swipe"]) {
  assert(block.includes(`${sel}:hover`), `${sel} uses it on hover and focus`);
}
assert(/text-decoration: none;\n\s*background-position: 0% 100%;/.test(block), "the plain underline is off while the stroke shows");
assert(block.includes(".series-feature-latest-title { justify-self: start; }"), "the grid-item title is only as wide as its words");
assert(/prefers-reduced-motion: reduce\) \{[^}]*transition: none;/.test(block), "reduced motion: it appears without sweeping");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
