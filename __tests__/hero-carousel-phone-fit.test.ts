/** Home hero carousel on a phone: one column exactly the page's width, so a wide slide picture cannot drag the carousel sideways. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");

assert(css.includes(".hero-carousel-stack { display: grid; grid-template-columns: minmax(0, 1fr); }"), "the carousel's single column is exactly the page's width");
assert(css.includes(".hero-carousel-slide, .hero-carousel-slide > * { min-width: 0; }"), "a slide and its parts may be narrower than their contents");
assert(css.includes("@media (max-width: 1050px) { html { overflow-x: clip; }"), "a page that is slightly too wide cannot be panned sideways on a phone");

const phone = css.slice(css.lastIndexOf("/* Phones: the carousel's arrows and dots were large"));
assert(/\.hero-carousel-btn \{ width: 30px; height: 30px; \}/.test(phone) && /\.hero-carousel-dot \{ width: 24px; height: 24px; \}/.test(phone) && /\.hero-carousel-controls \{ padding: 0 0 6px;/.test(phone), "on a phone the arrows and dots are smaller and leave no empty space under them");

assert(css.includes("@media (min-width: 1051px) {\n  .hero-carousel-slide .hero-featured-visual { max-height: none; aspect-ratio: auto; min-height: 440px; }"), "beside the text the hero picture is as tall as the slide, so the button never hangs below its bottom edge");
const wide = css.slice(css.indexOf("@media (min-width: 1051px) {\n  .hero-featured-visual {"));
const wideBlock = wide.slice(0, wide.indexOf("\n}\n") + 3);
assert(!/mask-image/.test(wideBlock) && wideBlock.includes(".hero-featured-visual::after") && wideBlock.includes("var(--ground-bg, var(--paper))"), "the left fade of the hero picture is a veil in the page's own colour, not a mask, so it does not change when one slide replaces another");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
