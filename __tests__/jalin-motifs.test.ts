/** Jalin motifs in the site: the emblem (loader, 404, empty state), the story-end divider and the footer's Bidai Beralih band. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const emblem = read("src/components/reader/JalinEmblem.tsx");
const logo = read("public/brand/jalin-icon-color.svg");
assert((emblem.match(/"fill":/g) ?? []).length === 9 && (logo.match(/<path/g) ?? []).length === 9, "the emblem has the nine blades of the logo file");
assert(["rgb(19,47,56)", "rgb(215,174,150)", "rgb(169,93,70)"].every((c) => emblem.includes(c)), "the emblem keeps the logo's own colours");

const css = read("src/app/globals.css");
assert(css.includes(".jalin-emblem.is-live .jalin-blade { animation: jalin-tenun"), "only a live emblem animates");
assert(/prefers-reduced-motion: reduce\) \{ \.jalin-emblem\.is-live \.jalin-blade, \.jalin-emblem\.is-live svg \{ animation: none; \}/.test(css), "no motion under prefers-reduced-motion");
assert(css.includes(".page-loading { min-height: 50vh; display: grid; place-items: center; animation: jalin-muncul .01s linear .35s both; }"), "the loader waits before appearing, so a quick page never flashes it");

assert(read("src/app/not-found.tsx").includes("<JalinEmblem animated"), "the 404 page shows the moving emblem");
assert(read("src/app/loading.tsx").includes('<JalinEmblem animated size={88} label="Memuatkan" />'), "the loading screen shows the moving emblem, named for screen readers");
assert(read("src/app/kategori/[type]/page.tsx").includes("<JalinEmblem size={72} />"), "an empty category shows the still emblem");

assert(read("src/components/reader/StoryChrome.tsx").includes('<div className="end-rule"><LilitDivider /></div>'), "the end of a story shows the Lilit Naskhah divider");
const lilit = read("src/components/reader/LilitDivider.tsx");
assert(lilit.includes('className="lilit-gap"') && css.includes(".lilit-divider .lilit-gap { stroke: var(--paper); }"), "the over strand sits on a paper-coloured gap, so no mask is needed");

assert(css.includes(".site-footer::before { content: \"\"; position: absolute; inset: 0 0 auto 0; height: 30px; background: url(/brand/motif/bidai-light.svg)"), "the footer has the Bidai Beralih band");
const bidai = read("public/brand/motif/bidai-light.svg");
assert(bidai.includes('width="48" height="24"') && !/<polygon|<circle/.test(bidai), "the band is the 48 x 24 strand tile, with no star or radial shape");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
