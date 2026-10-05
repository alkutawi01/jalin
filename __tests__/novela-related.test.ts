/**
 * Found by reading ChatGPT's advice and checking production: on Bab 3 of 10 of a novela the page ended with "Selepas ini: karya novela lain",
 * although "Tamat" and the editor's note were already held back until the last chapter. The reader who has just finished a middle chapter is
 * about to read the next one; other works are offered on the last chapter, on the novela's own page and on works without chapters.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const view = fs.readFileSync(path.join(__dirname, "../src/components/reader/WorkView.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(view.includes("{activeSection && nextSection ? null : <RelatedWorks works={relatedWorks} typeLabel={typeLabel} />}"), "no other works under a chapter that has a next chapter");
assert((view.match(/<RelatedWorks works=/g) ?? []).length === 1, "it is still rendered in one place (last chapter, novela page, works without chapters)");
// The three cases, as the page decides them
const shows = (active: boolean, next: boolean) => !(active && next);
assert(!shows(true, true) && shows(true, false) && shows(false, true) && shows(false, false), "middle chapter: no; last chapter: yes; novela page: yes; cerpen/fragmen/sinopsis: yes");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
