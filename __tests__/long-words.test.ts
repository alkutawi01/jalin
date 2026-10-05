/**
 * Edge-case data (a draft with a 120-character word in the title, a web address of 180 characters and a code line of 200
 * characters), rendered by the editor's preview at 375px on a temporary Neon branch:
 *  - the HTML typed into the title, dek and text was shown as plain text (no script, no onerror, no <b>): nothing to fix there;
 *  - the page was 2422px wide: a code block did not scroll on its own, and the "Tamat · title" line at the end did not wrap a long word.
 * After the fix the page was 375px wide and the code block scrolled inside itself (2403px of code in a 335px box).
 */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const line = (start: string) => css.split("\n").find((l) => l.startsWith(start)) ?? "";

assert(line("body { overflow-wrap: break-word; }") !== "", "text on every page may break a word that does not fit");
const anywhere = line(".story-end p, .editor-note p,");
for (const selector of [".story-end p", ".editor-note p", ".related-work-body h3", ".chapter-head h1", ".series-masthead h1", ".series-list-body h2"]) {
  assert(anywhere.includes(selector), `${selector} breaks a long word anywhere`);
}
assert(line(".story-body pre {").includes("overflow-x: auto") && line(".story-body pre {").includes("max-width: 100%"), "a code block scrolls inside itself instead of widening the page");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
