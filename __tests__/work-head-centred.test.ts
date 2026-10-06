/** Work page header: centred when the hero picture is below the text (900px and narrower), left-aligned beside it. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");

const wide = css.slice(css.indexOf(".work-head-text.story-head {"));
assert(/\.work-head-text\.story-head \{[^}]*text-align: left;/.test(wide), "beside the picture the text stays left-aligned");

const stacked = css.slice(css.indexOf("@media (max-width: 900px) {\n  .work-head {"));
const block = stacked.slice(0, stacked.indexOf("\n}\n") + 3);
assert(block.includes(".work-head-text.story-head { text-align: center; }"), "below 900px the kicker, title and dek are centred");
assert(block.includes(".work-head-text .dek { margin-inline: auto; }"), "below 900px the dek block is centred, not just its lines");
assert(block.includes(".work-head-text .byline { justify-content: center; }"), "below 900px the byline is centred");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
