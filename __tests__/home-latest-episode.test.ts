/**
 * Izzat (8 Okt): the homepage said "Episod terkini · Episod 1" although episode 2 was published. Republishing episode 1 made it the
 * most recently saved, and the highlight picked the latest by save time. It must be the highest-numbered episode.
 */
import fs from "node:fs";
import path from "node:path";
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const src = fs.readFileSync(path.join(__dirname, "..", "src/app/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(src.includes("const latest = ordered[ordered.length - 1]!;"), "the latest episode is the highest position");
assert(!/const latest = \[\.\.\.episodes\]\.sort/.test(src), "it is no longer chosen by publishedAt");
assert(src.includes("const at = newestAt;"), "the series is still ranked by its newest publication");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
