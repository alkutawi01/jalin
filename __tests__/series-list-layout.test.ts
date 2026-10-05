/**
 * The Bersiri list card: the picture must stay inside its column. A "min-height" next to "aspect-ratio" makes the picture
 * as wide as the ratio needs (220px x 1.5 = 330px) even when the column is narrower (217px), so it ran over the text.
 * The page eyebrow uses the same sans-serif label style as the other labels.
 */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const rule = (selector: string) => {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) return "";
  return css.slice(start, css.indexOf("}", start));
};

const media = rule(".series-list-media");
assert(media.includes("aspect-ratio") && media.includes("width: 100%"), "the picture is as wide as its column and the height follows from the ratio");
assert(!media.includes("min-height"), "the picture has no minimum height that would widen it past its column");
const mixed = css.split("\n").filter((line) => line.includes("aspect-ratio") && line.includes("min-height"));
assert(mixed.length === 0, "no rule combines a minimum height with an aspect ratio");
const kicker = rule(".category-kicker");
assert(kicker.includes("--font-inter") && kicker.includes("font-weight: 700"), "the category eyebrow uses the label font (Inter, bold), like the other labels");

// Homepage "Karya Terbaru" card: its link is a flex item of the card, so without "min-width: 0" it grows to the width of its
// content (370px in a 335px card on a phone) and the cover runs out of the card and is cut off.
assert(rule(".latest-card a").includes("min-width: 0"), "the latest-work card link can shrink to the card, so the cover stays inside it on a phone");

// ...and on a phone the card stacks (picture on top, text below at full width). Side by side it made two unequal columns: a
// tall dense text column next to a picture with empty space under it.
const phone = css.slice(css.indexOf("/* Phones: the card stacks"), css.indexOf("/* Very narrow phones"));
assert(phone.includes("@media (max-width: 480px)") && phone.includes(".latest-card a { flex-direction: column;") && phone.includes(".latest-card-cover { flex: none; width: 100%; }"), "on a phone the latest-work card stacks: picture on top, text at full width");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
