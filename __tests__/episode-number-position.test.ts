/**
 * Logic error, 8 Okt: the episode page numbered an episode by its place in the published list (index + 1), while the homepage and
 * the series page use the number the editor gave it (position). With an unpublished episode in between the same episode had two numbers.
 */
import fs from "node:fs";
import path from "node:path";
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const view = read("src/components/reader/EpisodeView.tsx");
const page = read("src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx");
assert(view.includes("episodes[episodeIndex]!.position"), "the episode number is its position");
assert(!/Episod \$\{episodeIndex|String\(episodeIndex|label: `Episod \$\{episodeIndex/.test(view),"no number is derived from the list index in the reader");
assert(view.includes("label: `Episod ${nextEpisode.position}`") && view.includes("label: `Episod ${prevEpisode.position}`"), "previous and next links carry the neighbour's own number");
assert(page.includes("`Episod ${mine.position}: `") && !page.includes("index + 1"), "the page title uses the position too");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
