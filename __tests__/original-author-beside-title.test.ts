/**
 * A sinopsis or fragmen shows the original author's name beside the original title (or in its place), never as "Oleh X",
 * which read as if X wrote the synopsis.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const chrome = read("src/components/reader/StoryChrome.tsx");
assert(chrome.includes("{originalAuthorBesideTitle ? null : <BylineRow byline={byline} />}"), "the hero has no 'Oleh' line for a derivative work");
assert(chrome.includes('{originalTitle && byline.length > 0 ? " · " : null}') && chrome.includes("story-original-author"), "the author sits after the original title, or alone when there is none");
assert(read("src/components/reader/WorkView.tsx").includes("originalAuthorBesideTitle={isDerivativeType(work.type)}"), "only sinopsis and fragmen use it; an original work keeps 'Oleh'");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
