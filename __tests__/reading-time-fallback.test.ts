/**
 * A new series episode (Suara dari Musalla, about 4,900 words) was published without the "Minit Bacaan" field, so its
 * "Tentang karya" showed "Bacaan: —" and its card in the series list showed no minutes. Chapters of a novela already count from
 * their text. All works and episodes now calculate from their text, ignoring old manually filled numbers.
 */
import fs from "node:fs";
import path from "node:path";
import { readingMinutesFor, readingMinutesOf } from "../src/lib/reader/reading-time";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail === undefined ? "" : JSON.stringify(detail)); }
}
const words = (n: number) => Array.from({ length: n }, () => "kata").join(" ");

assert(readingMinutesOf(words(4906)) === 25, "4,906 words is about 25 minutes", readingMinutesOf(words(4906)));
assert(readingMinutesOf("sepatah") === 1, "never less than a minute");
assert(readingMinutesFor(12, words(4906)) === 25, "manual minutes cannot override the text");
assert(readingMinutesFor("12", words(4906)) === 25, "legacy database strings cannot override the text");
assert(readingMinutesFor(null, words(4906)) === 25, "no number: estimated from the text");
assert(readingMinutesFor(0, words(1000)) === 5, "a stored 0 counts as not filled in");
assert(readingMinutesFor(undefined, "", "   ") === undefined, "no text and no number: nothing to show");
assert(readingMinutesFor(null, "", words(400), null, words(400)) === 4, "a novela with its text in chapters counts the chapters together", readingMinutesFor(null, "", words(400), null, words(400)));

const repo = fs.readFileSync(path.join(__dirname, "../src/lib/content/database-repository.ts"), "utf8");
assert((repo.match(/readingMinutesFor\(/g) ?? []).length === 4, "working copy, frozen copy and chapter records calculate from text");
assert(repo.split("this.worksByIdCache.get(String(row.id))?.readingMinutes").length - 1 === 2, "both episode lists use the published text calculation, not a newer draft");
assert(!/readingMinutes: row\.reading_minutes \? Number/.test(repo), "no place reads the stored minutes without the fallback");
assert(fs.readFileSync(path.join(__dirname, "../src/components/reader/NovelaChapters.tsx"), "utf8").includes("export { readingMinutesOf }"), "the chapter list still uses the same counting rule");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
