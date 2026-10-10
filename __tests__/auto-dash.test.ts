/** Two hyphens (or two en dashes) become one em dash with a space on each side; a Markdown scene break (---) is left alone. */
import { autoDash } from "../src/lib/admin/auto-dash";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(autoDash("Dia diam -- lama.") === "Dia diam \u2014 lama.", "two hyphens inside a sentence become an em dash");
assert(autoDash("kata--kata") === "kata \u2014 kata", "also without spaces: the em dash takes a space on each side");
assert(autoDash("Dia diam --") === "Dia diam \u2014 ", "at the end of a line it leaves a space so the next word can be typed");
assert(autoDash("-- Kau datang?") === "\u2014 Kau datang?", "a dash that opens a line (dialogue) has a space only after it");
assert(autoDash("a\u2013\u2013b") === "a \u2014 b", "two en dashes in a row become one spaced em dash");
assert(autoDash("a-\u2013b") === "a \u2014 b", "a hyphen next to an en dash counts too");
assert(autoDash("1990\u20132000") === "1990\u20132000", "a single en dash (a range) is unchanged");
assert(autoDash("a \u2014 b") === "a \u2014 b", "an em dash already there is not touched");
assert(autoDash("---") === "---", "a line of three hyphens is a scene break and is kept");
assert(autoDash("--") === "--", "a line of only two hyphens is left while the editor may still be typing ---");
assert(autoDash("a\n\n---\n\nb") === "a\n\n---\n\nb", "a scene break between paragraphs is kept");
assert(autoDash("ia -- dan --- itu") === "ia \u2014 dan --- itu", "three hyphens inside a line are not touched");
assert(autoDash("tiada tanda") === "tiada tanda", "text without hyphens is unchanged");
assert(autoDash("a-b") === "a-b", "a single hyphen is unchanged");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
