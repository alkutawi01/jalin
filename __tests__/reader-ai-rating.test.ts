/**
 * The AI rating on the reader page (10 Oct 2026 audit): the internal work id must not go to the page (the reading tracker and the rating
 * both name a work by its slug), the reasons follow the paywall, and "the text that was rated" is the frozen published copy.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const tracker = read("src/components/reader/ReadingTracker.tsx");
assert(tracker.includes("slug") && !/workId/.test(tracker), "the reading tracker names the work by slug, never by internal id");
assert(!/<ReadingTracker workId=|<ReadingTracker workSlug={work.id/.test(read("src/app/kategori/[type]/[slug]/page.tsx") + read("src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx")), "no page hands the internal id to the tracker");
const view = read("src/components/reader/WorkView.tsx");
assert(view.includes("workId: work.slug"), "the rating block is given the slug");
assert(view.includes("hasDb()"), "the rating block does not need the database when the site runs on files");

const api = read("src/app/api/penilaian-ai/[slug]/route.ts");
assert(api.includes("gateForWork(slug)") && api.includes("403"), "the reasons are refused when the work is locked for this viewer");
assert(api.includes('"published"'), "only published works answer");

const pub = read("src/lib/panel/public.ts");
assert(pub.includes("publishedTextHash"), "public ratings are matched to the frozen published text");
assert(!pub.includes("assemble("), "public ratings never use the live draft text");
const svc = read("src/lib/panel/service.ts");
assert(svc.includes("published_revision_id") && svc.includes("canonicalHash("), "the published hash uses the same arithmetic as the snapshot hash");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
