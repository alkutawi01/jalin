/** Home "Bersiri" block: the latest episode is a label, a one-line title link and the same pills as every other work (minutes, date). */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "..", "src/app/page.tsx"), "utf8").replace(/\r\n/g, "\n");

assert(page.includes('<a className="series-feature-latest-title" href={`${base}/${data.latest.slug}`}>{data.latest.title}</a>'), "the episode title is a link to the episode, on its own (no 'Episod 2 — ' in front of it)");
assert(page.includes("Episod terkini · Episod {data.latest.position}"), "the label says which episode it is");
assert(page.includes('<WorkMeta work={{ readingMinutes: data.latest.readingMinutes, publishedAt: data.latest.publishedAt }} variant="pills" />'), "minutes and the publishing date are the same pills as every other work");
assert(page.includes('<a className="home-action-primary hero-featured-cta" href={base}>Baca sekarang</a>'), "'Baca sekarang' goes to the series title page");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
