/**
 * The head of a series page and an episode's "Tentang karya" (Izzat, on a screenshot of Satu Daerah yang Paling Sunyi):
 *  - the series page listed "Bersambung · Berterusan · Rumah Tangga · 1 episod diterbitkan · Dikemas kini ..." and no author;
 *    it now shows who wrote it (the same "Oleh ..." row as a story) and one quiet line: form, status, genre;
 *  - status reads "Masih diteruskan" (not "Berterusan" / "Siri berterusan") and "Tamat";
 *  - the row that holds the series name is "Judul" (Izzat: one word for every kind of work, not "tajuk siri", "tajuk cerpen"...), not "Siri";
 *  - "Episod 1" with no "daripada 1", which made a series that has only one episode so far look as if it only ever has one.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const series = read("src/app/kategori/bersiri/[seriesSlug]/page.tsx");
assert(series.includes("<BylineRow byline={authors} />") && series.includes("projectBylineCredits("), "the series page shows who wrote it");
const metaStart = series.indexOf("const meta = [");
const metaBlock = series.slice(metaStart, series.indexOf("].filter(Boolean)", metaStart));
assert(metaBlock.includes("MODE_LABELS") && metaBlock.includes("STATUS_LABELS") && metaBlock.includes("displayableGenre") && !metaBlock.includes("episod diterbitkan") && !metaBlock.includes("Dikemas kini"), "the line under it is only form, status and genre (no episode count, no date)");
assert(series.includes("ongoing: \"Masih diteruskan\""), "an ongoing series reads 'Masih diteruskan'");

const episode = read("src/components/reader/EpisodeView.tsx");
assert(episode.includes("{ label: \"Judul\", value: series.title }") && !episode.includes("{ label: \"Siri\",") && !episode.includes("Tajuk siri"), "the row that holds the series name is called 'Judul', like the title row of every other kind of work");
assert(episode.includes("`Episod ${episodeIndex + 1} · `") && episode.includes("String(episodeIndex + 1)") && !episode.includes("daripada"), "the episode number has no 'daripada N'");
assert(episode.includes("\"Tamat\" : \"Masih diteruskan\""), "the status row reads Tamat or Masih diteruskan");

assert(read("src/app/kategori/[type]/page.tsx").includes("ongoing: \"Masih diteruskan\""), "the Bersiri list says the same");
for (const file of ["src/app/admin/series/page.tsx", "src/app/admin/series/new/page.tsx", "src/app/admin/series/[id]/page.tsx"]) {
  assert(!/Berterusan/.test(read(file)), `${file} uses the same word`);
}

const chrome = read("src/components/reader/StoryChrome.tsx");
assert(chrome.includes("export function BylineRow") && (chrome.match(/<BylineRow byline=\{byline\} \/>/g) ?? []).length === 1, "a story and a series use one byline markup");
assert(read("src/app/globals.css").includes(".series-masthead .byline { justify-content: flex-start;"), "the series byline is left aligned like the rest of its head");

// the series link under an episode's dek had a permanent underline while the author names below it have none
const contextLink = read("src/app/globals.css").split("\n").find((line) => line.startsWith(".story-context-line a {")) ?? "";
assert(contextLink.includes("text-decoration: none") && contextLink.includes("font-weight: 600"), "the series link in the episode head has no permanent underline, like the author names");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
