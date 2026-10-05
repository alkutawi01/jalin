/**
 * The "Info" button on a phone sat on the right edge half way down the screen and covered the words being read (a word of the
 * dek was cut off on a Gatsby Agung screenshot). It is in the bottom corner now. Checked in a browser at 375px: it sits at
 * 295-359px across and 752-796px down, clear of the text column.
 */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const start = css.indexOf("  .mobile-info-handle {");
const block = css.slice(start, css.indexOf("}", start));
assert(start > 0, "the phone rule for the Info button exists");
assert(block.includes("bottom: max(16px, env(safe-area-inset-bottom))") && block.includes("right: 16px"), "the button is in the bottom-right corner, above the phone's home bar");
assert(!block.includes("top: 48%") && !block.includes("translateY(-50%)"), "it is not half way down the screen any more");
assert(block.includes("min-height: 44px") && block.includes("min-width: 44px"), "it is still big enough to tap");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
