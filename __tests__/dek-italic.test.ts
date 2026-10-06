/** Deks are italic everywhere except on cards: the story page and the home hero are italic, the card deks stay upright. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const rule = (selector: string) => {
  const i = css.indexOf(`\n${selector} {`);
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i));
};

assert(/font-style: italic/.test(rule(".dek")), "the dek of a story page is italic");
assert(/font-style: italic/.test(rule(".hero-featured-dek")), "the dek in the home hero is italic");
for (const card of [".latest-card-dek", ".work-card-dek", ".episode-card-dek"]) {
  assert(!/font-style: italic/.test(rule(card)) && !css.includes(`${card} { font-style: italic`), `${card} (a card) stays upright`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
