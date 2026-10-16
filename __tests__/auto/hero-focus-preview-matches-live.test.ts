/** The focus picker previews the shapes the homepage hero really takes (measured live), with the fade drawn on, and warns when the focus sits under the fade. */
import fs from "node:fs";
import path from "node:path";
import { VEIL_FOCUS_LIMIT } from "../../src/components/admin/ImageFocusPicker";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");
const picker = read("src", "components", "admin", "ImageFocusPicker.tsx");
const css = read("src", "app", "globals.css");

// measured on the live site on 16 Okt 2026
for (const [label, ratio] of [["komputer 1.2", "1.2 / 1"], ["laptop 1.66", "1.66 / 1"], ["tablet 0.94", "0.94 / 1"], ["tablet tegak 0.74", "0.74 / 1"], ["telefon 1.18", "1.18 / 1"]]) {
  assert(picker.includes(`label: "Laman utama, ${label}", ratio: "${ratio}"`), `the picker shows the homepage hero as it is on a ${label.split(" ")[0]} screen`);
}
assert(!picker.includes("Laman utama 4:3.4"), "the old 4:3.4 guess is gone");
assert(picker.includes('ratio: "1.2 / 1", veil: [12, 31, 48]') && picker.includes('ratio: "0.74 / 1", veil: [8, 20, 32]') && !/telefon 1\.18", ratio: "1\.18 \/ 1", veil/.test(picker), "the fade is drawn on every shape that has it, and not on the phone");

// the tablet fade scales with the picture
const at = css.indexOf("@media (min-width: 761px) and (max-width: 1050px) {");
const end = css.indexOf("/* Homepage \"Bersiri\" carousel on a phone", at);
const tablet = css.slice(at, end);
assert(tablet.includes("transparent 32%") && tablet.includes("82%, transparent) 8%") && tablet.includes("28%, transparent) 20%"), "the tablet fade is 8% / 20% / 32% of the picture");
assert(!/transparent 240px/.test(tablet), "no fixed 240px that swallows a narrow picture");
assert(css.includes("transparent 340px"), "the wide-screen fade is unchanged (Izzat's approved look)");

// the warning
assert(VEIL_FOCUS_LIMIT === 35, "a focus further left than 35% sits under the fade");
assert(picker.includes("value.x < VEIL_FOCUS_LIMIT") && picker.includes("larut ke latar halaman"), "the picker says so, in plain words");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
