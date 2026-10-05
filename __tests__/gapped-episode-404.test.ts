/**
 * A continuous series' public run is unbroken from episode 1. An episode after a gap was left out of the series page, its navigation and the
 * sitemap but still answered 200 at its own address (a fallback looked it up by episode slug alone), and the legacy flat address redirected to
 * it. Verified on a temporary database branch: before, the gapped episode answered 200 and 307; after, 404 and 404, while an episode in the run
 * still answers 200 / 307.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, p), "utf8").replace(/\r\n/g, "\n");
const episode = read("../src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx");
assert(!episode.includes("repo.getWork(episodeSlug)"), "the episode page no longer finds an episode by its slug alone");
assert(episode.includes("repo.getEpisodeBySeriesAndSlug(seriesSlug, episodeSlug)"), "it uses the series' public run");
const series = read("../src/app/kategori/bersiri/[seriesSlug]/page.tsx");
assert(series.includes("getPublishedSeriesEpisodes(work.series.id).some((episode) => episode.slug === work.slug)") && series.includes("&& inRun"), "the old flat address redirects only to an episode that is in the run");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
