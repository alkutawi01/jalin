/** On a tablet or narrow window (681-1050px) the hero's text uses two columns under the picture: nothing is left empty on the right. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const start = css.indexOf("@media (min-width: 681px) and (max-width: 1050px) {\n  .hero-carousel-slide .hero-featured-text { display: grid;");
const block = start >= 0 ? css.slice(start, css.indexOf("\n}\n", start) + 3) : "";

assert(start > 0, "there is a block for 681 to 1050px");
assert(block.includes("grid-template-columns: minmax(0, 1fr) auto"), "the text is a grid of a wide column and a column for the pills and the button");
assert(block.includes("> .home-work-meta { grid-column: 2; grid-row: 3;") && block.includes("> .hero-featured-cta { grid-column: 2; grid-row: 4;"), "the pills and the button sit in the right column");
assert(block.includes("max-height: clamp(220px, 34svh, 340px)"), "the picture is held to about a third of the window's height");
assert(block.includes("-webkit-line-clamp: 4"), "the summary is held to four lines");
assert(css.indexOf(start >= 0 ? block : "x") > css.indexOf("@media (min-width: 681px) and (max-width: 1050px) { .hero-carousel-slide .hero-featured-dek { max-width: 600px; } }"), "it comes after the old 600px summary cap, so it wins");
assert(css.includes("@media (max-width: 1050px) {\n  .hero-featured-inner {\n    grid-template-columns: 1fr;"), "the stacked layout itself is untouched, so phones are unchanged");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
