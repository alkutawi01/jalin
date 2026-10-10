/** Printing a story: the website around it stays out of the printout (10 Oct 2026 UI loop). */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const i = css.lastIndexOf("@media print {\n  .site-header");
const block = i >= 0 ? css.slice(i, css.indexOf("\n}\n", i)) : "";
assert(i >= 0, "there is a print block for the story page");
for (const sel of [".site-header", ".site-footer", ".right-rail", ".related-works", ".continue-nav", ".mobile-info-row"]) {
  assert(block.includes(sel), `${sel} is left out of the printout`);
}
assert(block.includes(".reading-grid > .left-rail { display: block !important; }"), "the left column (credits, note on who wrote it) is forced to show on paper, below the 1050px rule that hides it");
assert(block.includes("main .story-body {") && block.includes("filter: none !important"), "a reader's own text settings (size, dimming) do not reach the printout");
assert(block.includes(".reading-grid { display: block !important; }"), "the story runs in one column");
assert(block.includes(".rail-card.sticky { position: static !important; max-height: none !important; overflow: visible !important; }"), "a side card never clips on paper");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
