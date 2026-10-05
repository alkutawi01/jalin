/**
 * Consistency found by looking at the public pages next to each other:
 *  - the series dek was stored with straight quotes and shown that way, while every other dek shows the house curly quotes;
 *  - the series premise was upright while every other dek is italic;
 *  - list card titles: Cerpen cards are bold, Bersiri cards were medium weight.
 */
import fs from "node:fs";
import path from "node:path";
import { projectPublicSeries } from "../src/lib/reader/public-projection";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const straight = "\"Lelaki tidak bercerita,\" katanya. 'Tidurlah, sayang.'";
const series = projectPublicSeries({ id: "S1", slug: "s", title: "S", mode: "continuous", status: "ongoing", dek: straight } as never);
assert(series.dek === "“Lelaki tidak bercerita,” katanya. 'Tidurlah, sayang.'", `a series dek in a list gets curly double quotes (${series.dek})`);
assert(projectPublicSeries({ id: "S2", slug: "s", title: "S", mode: "continuous", status: "ongoing" } as never).dek === undefined, "no dek stays no dek");

for (const file of [
  "src/app/kategori/bersiri/[seriesSlug]/page.tsx",
  "src/app/page.tsx",
  "src/components/reader/HeroCarousel.tsx",
  "src/components/reader/StoryChrome.tsx"
]) {
  assert(read(file).includes("smartQuotes("), `${file} shows the dek with curly quotes`);
}
const seriesPage = read("src/app/kategori/bersiri/[seriesSlug]/page.tsx");
assert(seriesPage.includes("smartQuotes(series.dek)") && seriesPage.includes("smartQuotes(episode.dek)"), "series premise, description and episode cards all use the house quotes");

const css = read("src/app/globals.css");
const premise = css.split("\n").find((line) => line.startsWith(".series-premise {")) ?? "";
assert(premise.includes("font-style: italic"), "the series premise is italic like every other dek");
const listTitle = css.split("\n").find((line) => line.startsWith(".series-list-body h2 {")) ?? "";
assert(listTitle.includes("font-weight: 700"), "a Bersiri list title is bold like a Cerpen list title");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
