/** On a laptop-height window the homepage hero fits the window; a taller window keeps the original sizes. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const start = css.indexOf("@media (min-width: 1051px) and (max-height: 860px) {");
const block = start >= 0 ? css.slice(start, css.indexOf("\n}\n", start) + 3) : "";

assert(start > 0, "the compact hero is only for a wide window that is at most 860px tall");
assert(block.includes("max-height: calc(100svh - 89px - 56px)"), "the picture is no taller than the window less the header");
assert(block.includes("-webkit-line-clamp: 5"), "the description is held to five lines, so one long slide does not set every slide's height");
assert(block.includes("font-size: clamp(38px, 3.5vw, 50px)"), "the title is a little smaller");
assert(block.includes(".hero-featured-inner { min-height: 0; }"), "the fixed 520px minimum of the hero is lifted");
assert(css.includes("@media (min-width: 1051px) {\n  .hero-carousel-slide .hero-featured-visual { max-height: none; aspect-ratio: auto; min-height: 440px; }"), "the original rule is untouched, so a taller window keeps its sizes");
assert(css.indexOf("max-height: calc(100svh - 89px - 56px)") > css.indexOf("min-height: 440px; }"), "the compact rules come after the original one, so they win");
assert(/@media \(min-width: 1051px\) \{\n  \.hero-carousel-slide \.hero-featured-visual \{[^\n]*\}\n(?:  \/\*[\s\S]*?\*\/\n)?  \.hero-carousel-slide \.hero-featured-dek \{[^}]*-webkit-line-clamp: 5/.test(css), "on a tall monitor too one long description does not make every slide (and the picture) taller");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
