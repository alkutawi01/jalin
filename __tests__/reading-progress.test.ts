/** The thin line along the top of a story that fills as the reader scrolls. */
import fs from "node:fs";
import path from "node:path";
import { readingProgress } from "../src/lib/reader/reading-progress";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// text 3000px tall starting 500px down the page, screen 800px high: it can be scrolled 2200px
assert(readingProgress(0, 500, 3000, 800) === 0, "above the text: nothing filled");
assert(readingProgress(500, 500, 3000, 800) === 0, "the top of the text at the top of the screen: 0");
assert(Math.abs(readingProgress(1600, 500, 3000, 800)! - 0.5) < 1e-9, "halfway through the scrollable part: 0.5");
assert(readingProgress(2700, 500, 3000, 800) === 1, "the end of the text at the bottom of the screen: 1");
assert(readingProgress(9000, 500, 3000, 800) === 1, "scrolled past the text (the end of the page): still 1");
assert(readingProgress(0, 500, 700, 800) === null && readingProgress(0, 500, 800, 800) === null, "a text that fits on one screen has nothing to show");
assert(readingProgress(100, 0, Number.NaN, 800) === null, "an unmeasurable text shows nothing");

const bar = read("src/components/reader/ReadingProgress.tsx");
assert(bar.includes('aria-hidden="true"') && bar.includes('{ passive: true }'), "screen readers skip it and the scroll listener is passive");
assert(read("src/components/reader/WorkView.tsx").includes("{landing ? null : <ReadingProgress />}") && read("src/components/reader/EpisodeView.tsx").includes("<ReadingProgress />"), "stories, chapters and episodes have it; the novela's cover page does not");
assert(read("src/app/globals.css").includes("@media print { .reading-progress { display: none !important; } }"), "it is not printed");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
