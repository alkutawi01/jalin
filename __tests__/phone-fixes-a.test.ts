/**
 * Three faults found on a phone:
 * 1) the header did not stay at the top (body { overflow-x: hidden } made the body a scroll container, so "sticky" stuck to the body);
 * 2) a glossary box (and a note box) stayed open and followed the reader along the edge of the screen after scrolling away;
 * 3) the carousel showed an empty picture box the first time it moved to the second or third slide (those pictures were lazy).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const css = read("src/app/globals.css");
assert(css.includes("body { overflow-x: hidden; overflow-x: clip; container-type: inline-size; }"), "the body clips the sideways overshoot (clip, with hidden only as the fallback for old browsers), so the sticky header still sticks");
assert(/\.site-header\s*\{[^}]*position:\s*sticky/.test(css), "the header is sticky");

const term = read("src/components/reader/GlossaryTerm.tsx");
assert(term.includes("if (rect.bottom < 0 || rect.top > window.innerHeight) {\n        setOpen(false);"), "a glossary box closes when its word is scrolled off the screen");
const notes = read("src/components/reader/FootnoteMargin.tsx");
assert(notes.includes("if (rect.bottom < 0 || rect.top > window.innerHeight) {\n        setPopover(null);"), "a note box closes when its number is scrolled off the screen");

const carousel = read("src/components/reader/HeroCarousel.tsx");
assert(carousel.includes('loading={i === 0 ? undefined : "eager"}') && carousel.includes('fetchPriority={i === 0 ? undefined : "low"}') && carousel.includes("priority={i === 0}"), "the pictures of the later slides are fetched at once (low priority), not lazily, so a slide never arrives with an empty box");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
