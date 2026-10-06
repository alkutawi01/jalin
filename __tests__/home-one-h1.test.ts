/** The home page carousel had one h1 per slide (two h1s on the page). Only the first slide's title is the h1. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = fs.readFileSync(path.join(__dirname, "../src/components/reader/HeroCarousel.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(src.includes("{i === 0 ? (") && src.includes('<h2 className="hero-featured-title"'), "the first slide is the h1, the others are h2");
assert((src.match(/<h1\b/g) ?? []).length === 1, "exactly one h1 in the carousel markup");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
