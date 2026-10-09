/**
 * On a phone the number of a footnote in a story is a link about 9 by 15 pixels (found on a phone-size look at a story with notes, Oct 2026):
 * a thumb cannot hit it. On a touch screen the link now reaches 12px further each way; the look is unchanged and a mouse is unaffected.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");

const start = css.indexOf("@media (pointer: coarse) {\n  .footnote-ref a");
const block = start < 0 ? "" : css.slice(start, css.indexOf("\n}\n", start) + 3);
assert(block.includes(".footnote-ref a { position: relative; }"), "on a touch screen the link is the anchor for a larger hit area");
assert(/\.footnote-ref a::after \{ content: ""; position: absolute; inset: -12px; \}/.test(block), "the hit area reaches 12px further each way (about 33 by 39px)");
assert(!/^\.footnote-ref a::after/m.test(css), "a mouse keeps the plain small link: the larger area is only for touch");
assert(/\.footnote-ref a \{ color: var\(--clay-text\); text-decoration: none; padding: 0 2px;/.test(css), "the look of the number is unchanged");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
