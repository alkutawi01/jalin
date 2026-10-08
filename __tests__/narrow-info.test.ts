/**
 * Izzat, on a narrow screen: "ke mana menghilangnya 'Tentang Karya'? mcm mana nak baca?"
 *  - below 820px the side columns are hidden and "Tentang karya" (with the characters, places and editorial) lives in a sheet;
 *  - a series EPISODE page built the data for that sheet but never rendered it, so on a phone there was no way to read it at all;
 *  - on the other pages the trigger was a small floating "Info" button at the edge, easy to miss.
 * Now the trigger is an inline button, "Tentang karya ›", on every story, chapter and episode page, just above the text.
 * Also: the series page has no "Mula Episod 1" / "Episod terkini" buttons (a reader picks an episode from the list), and its
 * picture is as tall as the text beside it (at 1000px it was 318px against 462px of text).
 * Checked in a browser on a temporary Neon branch at 375, 1000 and 1280px (the sheet opened with Karya, Watak and Editorial).
 */
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const work = read("src/components/reader/WorkView.tsx");
const episode = read("src/components/reader/EpisodeView.tsx");
assert((work.match(/<MobileStoryInfo data=\{mobileInfo\} \/>/g) ?? []).length === 1, "a story or chapter page renders the info sheet");
assert((episode.match(/<MobileStoryInfo data=\{mobileInfo\} \/>/g) ?? []).length === 1, "a series episode page renders it too (it built the data and never showed it)");
for (const [name, source] of [["story", work], ["episode", episode]] as const) {
  const row = source.indexOf("mobile-info-row");
  const columns = source.indexOf("site-shell reading-grid", row); // the grid's class may carry "has-margin-notes"
  assert(row > 0 && columns > row, `on the ${name} page the trigger sits above the text, not at the end`);
}
const mobileInfo = read("src/components/reader/MobileStoryInfo.tsx");
assert(mobileInfo.includes("Tentang karya<span aria-hidden=\"true\"> ›</span>"), "the trigger says what it opens");
assert(mobileInfo.includes("const hasCharacters = data.characters.length > 0") && mobileInfo.includes("{hasCharacters ? ("), "an empty Watak tab is not offered");
assert(mobileInfo.includes('...(hasCharacters ? (["watak"] as Tab[]) : [])'), "keyboard navigation skips the absent Watak tab");

const css = read("src/app/globals.css");
const start = css.indexOf("  .mobile-info-handle {");
const block = css.slice(start, css.indexOf("}", start));
assert(block.includes("position: static") && !block.includes("position: fixed"), "it is part of the page, not floating over it");
assert(block.includes("min-height: 44px") && block.includes("font-size: 14px"), "it is big enough to read and tap");
assert(css.includes(".mobile-info-row { display: block;"), "the row shows below 820px");
assert(css.includes("margin: 0 auto 20px;"), "the trigger has room before the first paragraph (it was 8px at 768px)");

const series = read("src/app/kategori/bersiri/[seriesSlug]/page.tsx");
assert(!series.includes("Mula Episod") && !series.includes("Episod terkini") && !series.includes("series-actions"), "the series page has no read buttons");
assert(css.includes(".series-masthead--hero .series-hero { aspect-ratio: auto; min-height: 320px; }") && css.includes(".series-masthead--hero { align-items: stretch; }"), "beside the text the series picture is as tall as the text");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
