/** Two hyphens become an em dash; a Markdown scene break (---) is left alone. */
import { autoDash } from "../src/lib/admin/auto-dash";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(autoDash("Dia diam -- lama.") === "Dia diam \u2014 lama.", "two hyphens inside a sentence become an em dash");
assert(autoDash("kata--kata") === "kata\u2014kata", "also without spaces");
assert(autoDash("---") === "---", "a line of three hyphens is a scene break and is kept");
assert(autoDash("--") === "--", "a line of only two hyphens is left while the editor may still be typing ---");
assert(autoDash("a\n\n---\n\nb") === "a\n\n---\n\nb", "a scene break between paragraphs is kept");
assert(autoDash("ia -- dan --- itu") === "ia \u2014 dan --- itu", "three hyphens inside a line are not touched");
assert(autoDash("tiada tanda") === "tiada tanda", "text without hyphens is unchanged");
assert(autoDash("a-b") === "a-b", "a single hyphen is unchanged");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
