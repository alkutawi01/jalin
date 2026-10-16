/** The home page has exactly one h1, outside the slides, so it never leaves the page when a slide is hidden. Every slide title is an h2. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/components/reader/HeroCarousel.tsx"), "utf8").replace(/\r\n/g, "\n");
assert((src.match(/<h1\b/g) ?? []).length === 1, "exactly one h1 in the carousel markup");
assert(src.includes('<h1 className="sr-only">'), "the h1 is not inside a slide");
assert(src.includes('<h2 className="hero-featured-title"') && !src.includes("{i === 0 ? ("), "every slide title is an h2");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
