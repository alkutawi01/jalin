/** Text colours in the stylesheet must be readable (WCAG AA, 4.5:1) on the page and card backgrounds. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8");
const token = (name: string): string => {
  const m = css.match(new RegExp("--" + name + ": *(#[0-9a-fA-F]{6})"));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1]!;
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

for (const bg of ["paper", "white"]) {
  assert(ratio(token("ink"), token(bg)) >= 4.5, `ink is readable on ${bg}`);
  assert(ratio(token("ink-soft"), token(bg)) >= 4.5, `ink-soft is readable on ${bg}`);
  assert(ratio(token("clay-text"), token(bg)) >= 4.5, `clay-text is readable on ${bg}`);
}
assert(ratio(token("clay-text"), "#f7ece4") >= 4.5, "clay-text is readable on the peach band");

// --clay itself is for borders and large marks (below 4.5:1 on cream); small text must use --clay-text.
const textUses = css.split("\n").filter((line) => /[ ;{]color: var\(--clay\);/.test(line));
assert(textUses.length === 0, `no text is coloured with --clay (found ${textUses.length})`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
