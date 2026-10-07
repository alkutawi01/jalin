/**
 * Laptop-size reading typography (1051 to 1600px wide). The story text, its sub-headings and the titles were sized for a large
 * monitor and felt too big on a laptop: 21px text, 31.5px sub-headings on a 58px line, a 68 to 84px title.
 * Larger monitors keep the original sizes.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${msg}`, detail ?? "");
  }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");

const start = css.indexOf("@media (min-width: 1051px) and (max-width: 1600px) {\n  .reading-grid { grid-template-columns: 180px minmax(0, 690px) 180px; }");
assert(start >= 0, "there is a laptop block for 1051 to 1600px");
const block = start >= 0 ? css.slice(start, css.indexOf("\n}\n", start)) : "";
assert(/\.story-body \{ font-size: 19px; line-height: 1\.75; \}/.test(block), "the story text is 19px on a laptop, with a 1.75 line");
assert(/\.story-body h2 \{ font-size: 1\.32em; line-height: 1\.3;/.test(block), "a sub-heading is 1.32em on its own 1.3 line, not on the text's tall line");
assert(/\.story-head h1 \{ font-size: clamp\(44px, 4\.6vw, 58px\); \}/.test(block) && /\.work-head-text h1 \{ font-size: clamp\(40px, 4\.2vw, 56px\); \}/.test(block), "titles stop at 56 to 58px on a laptop");
assert(/^\.story-body \{[^}]*font-size: 21px;/m.test(css), "larger monitors keep the 21px text");

console.log(`laptop-typography: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
