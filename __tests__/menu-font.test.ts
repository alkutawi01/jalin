/**
 * Izzat chose Figtree for the main menu (option C of the font chooser, 5 Oct 2026). Only the menu uses it: the header navigation,
 * the phone menu button and its list. Footer navigation, labels and buttons stay Inter; story text stays Georgia.
 * Checked in a browser: the menu rendered in Figtree (font loaded), the footer link in Inter, and the open phone menu fit the screen.
 */
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const layout = read("src/app/layout.tsx");
assert(layout.includes("Figtree({") && layout.includes('variable: "--font-figtree"'), "Figtree is loaded by Next and exposed as --font-figtree");
assert(layout.includes("${figtree.variable}") && layout.includes("${inter.variable}"), "the page carries both font variables");

const css = read("src/app/globals.css");
const rule = css.split("\n").find((line) => line.startsWith(".header-nav, .header-nav a,")) ?? "";
assert(rule.includes("font-family: var(--font-figtree), var(--font-inter)"), "the menu is set in Figtree and falls back to Inter");
for (const selector of [".header-nav a", ".header-mobile-nav summary", ".header-mobile-nav .header-mobile-nav-links a"]) {
  assert(rule.includes(selector), `${selector} is covered`);
}
assert(!rule.includes("footer") && !/^nav\b/.test(rule), "the footer navigation and the other nav elements are not changed");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
