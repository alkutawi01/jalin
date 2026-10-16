/** On a tablet (761-1050px) the hero's picture stays on the right, its left edge fades into the page, and its corners are square. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const at = css.indexOf("@media (min-width: 761px) and (max-width: 1050px) {");
const end = css.indexOf("/* Homepage \"Bersiri\" carousel on a phone", at);
const block = at >= 0 && end > at ? css.slice(at, end) : "";
assert(block.length > 0, "there is a tablet block");
assert(block.includes("grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr)"), "text on the left and the picture on the right");
assert(block.includes("border-radius: 0; box-shadow: none; }"), "the picture's corners are square");
assert(/\.hero-carousel-slide \.hero-featured-visual::after \{[^}]*linear-gradient\(to right,/.test(block), "a veil fades the picture's left edge");
assert(block.includes("var(--ground-bg, var(--paper)) 0,") && block.includes("transparent 32%"), "the veil starts at the page colour and is clear by 32% of the picture");
assert(block.includes(".image-rights { z-index: 2; }"), "the rights line stays above the veil");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
