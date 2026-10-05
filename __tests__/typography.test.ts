/**
 * One type system, found by measuring the fonts on the public pages (Izzat: "apa jenis font yg ada dlm Jalin? ... mcm tak sesuai"):
 *  - the serif is Georgia (titles, the story text) and the sans-serif is Inter (labels, navigation, buttons);
 *  - 20 rules still named Arial for the same jobs (kickers, side-column labels and text, series breadcrumb), so labels on
 *    one page came out in two different sans-serifs;
 *  - the breadcrumb was Inter 16px sentence case on a chapter page and Arial 12px capitals on a series page;
 *  - a series page title was bold and 73px while a work title is medium weight and 64px.
 */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(!/font-family:\s*Arial/.test(css), "no rule names Arial any more: the sans-serif is Inter everywhere");
const families = new Set([...css.matchAll(/font-family:\s*([^;}]*)/g)].map((m) => m[1]!.trim().split(",")[0]!.replace(/"/g, "")));
// Figtree is the main menu's typeface (Izzat's choice, 5 Oct 2026); see menu-font.test.ts.
const known = ["var(--font-inter)", "var(--font-figtree)", "Georgia", "SFMono-Regular", "inherit"];
const unknown = [...families].filter((family) => !known.includes(family));
assert(unknown.length === 0, `only the known families are used (Inter, Figtree for the menu, Georgia, a monospace)${unknown.length ? ": " + unknown.join(", ") : ""}`);

const crumbs = css.split("\n").find((line) => line.startsWith(".crumbs, .series-crumb {")) ?? "";
assert(crumbs.includes("--font-inter") && crumbs.includes("text-transform: uppercase") && crumbs.includes("font-size: 12px"), "one breadcrumb style (small capitals, Inter) for chapters and series");
assert(css.split("\n").some((line) => line.startsWith(".crumbs a { color: var(--clay-text)")), "breadcrumb links are in the accent colour");

const masthead = css.split("\n").find((line) => line.startsWith(".series-masthead h1 {")) ?? "";
assert(masthead.includes("font-weight: 500") && masthead.includes("4rem"), "a series title is medium weight and no larger than a work title");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
