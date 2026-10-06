/** Home hero carousel on a phone: one column exactly the page's width, so a wide slide picture cannot drag the carousel sideways. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");

assert(css.includes(".hero-carousel-stack { display: grid; grid-template-columns: minmax(0, 1fr); }"), "the carousel's single column is exactly the page's width");
assert(css.includes(".hero-carousel-slide, .hero-carousel-slide > * { min-width: 0; }"), "a slide and its parts may be narrower than their contents");
assert(css.includes("@media (max-width: 1050px) { html { overflow-x: clip; }"), "a page that is slightly too wide cannot be panned sideways on a phone");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
