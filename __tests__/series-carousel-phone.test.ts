/** In the series carousel on a phone the picture is the card's width: nothing is clipped by the scrolling track. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const hack = css.indexOf("@media (max-width: 700px) {\n  .series-feature-media, .hero-figure { width: 100vw;");
const fix = css.indexOf("@media (max-width: 700px) {\n  .series-carousel-track .series-feature-media {");
const track = css.indexOf(".series-carousel-track { display: flex; overflow-x: auto;");

assert(track > 0 && /overflow-x: auto/.test(css.slice(track, track + 120)), "the slides sit in a scrolling track, which clips both sides");
assert(hack > 0, "the full-bleed rule for a series picture still exists (it is right outside the track)");
assert(fix > hack, "the carousel rule comes after the full-bleed rule, so it wins");
const block = css.slice(fix, css.indexOf("\n}\n", fix) + 3);
assert(block.includes("width: 100%; max-width: 100%; margin-left: 0; border-radius: 12px;"), "inside the track the picture is the card's width, not a bleed beyond it");
assert(block.includes(".series-carousel-track .series-feature-overlay { padding-left: 16px; }"), "the title keeps a left padding inside the card");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
