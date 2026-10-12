/** The dek of a work page is clearly smaller than the story text at every width (about 0.85 of it). */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const at = css.indexOf(".work-head-text .dek { font-size: 18px; line-height: 1.55; }");
assert(at > 0, "there is a work-head dek size rule");
const tail = css.slice(at);
const size = (re: RegExp) => Number((tail.match(re) ?? [])[1]);

// story text sizes in the sheet: base, laptop and phone
const bodyBase = Number((css.match(/\.story-body \{\n  min-width: 0;\n  font-size: (\d+(?:\.\d+)?)px;/) ?? [])[1]);
const bodyLaptop = Number((css.match(/@media \(min-width: 1051px\) and \(max-width: 1600px\) \{\n  \.reading-grid[^\n]*\n  \.story-body \{ font-size: (\d+(?:\.\d+)?)px;/) ?? [])[1]);
const bodyPhone = Number((css.match(/\.story-body \{ font-size: (17\.5)px; line-height: 1\.78; \}/) ?? [])[1]);
const dekBase = size(/^\.work-head-text \.dek \{ font-size: (\d+(?:\.\d+)?)px/);
const dekLaptop = size(/\(min-width: 1051px\) and \(max-width: 1600px\) \{ \.work-head-text \.dek \{ font-size: (\d+(?:\.\d+)?)px/);
const dekPhone = size(/\(max-width: 820px\) \{ \.work-head-text \.dek \{ font-size: (\d+(?:\.\d+)?)px/);

assert(bodyBase === 21 && bodyLaptop === 19 && bodyPhone === 17.5, "the story text sizes this test measures against are 21, 19 and 17.5px");
assert(dekBase / bodyBase <= 0.88 && dekBase / bodyBase >= 0.8, `desktop: ${dekBase}px against ${bodyBase}px`);
assert(dekLaptop / bodyLaptop <= 0.88 && dekLaptop / bodyLaptop >= 0.8, `laptop: ${dekLaptop}px against ${bodyLaptop}px`);
assert(dekPhone / bodyPhone <= 0.93 && dekPhone / bodyPhone >= 0.8, `phone: ${dekPhone}px against ${bodyPhone}px`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
