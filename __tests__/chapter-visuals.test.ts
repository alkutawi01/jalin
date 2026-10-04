/** Which images a chapter page shows, and what structured data says about the audience. */
import { chapterHeroOf, visualsForPage } from "../src/lib/reader/chapter-visuals";
import { audienceOf } from "../src/lib/seo-jsonld";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const v = [
  { id: 1, role: "hero" },
  { id: 2, role: "section", sectionSlug: "bab-2" },
  { id: 3, role: "inline", anchor: "[[gambar:1]]", sectionSlug: "bab-2" },
  { id: 4, role: "inline", anchor: "[[gambar:1]]", sectionSlug: "bab-3" },
  { id: 5, role: "inline", anchor: "Petikan lama" }
];
const ids = (list: Array<{ id: number }>) => list.map((x) => x.id).join(",");

assert(ids(visualsForPage(v, undefined, "")) === "1,5", "outside a chapter only images that belong to no chapter are used");
assert(ids(visualsForPage(v, "bab-2", "teks [[gambar:1]]")) === "2,3", "a chapter shows its own images and not another chapter's");
assert(ids(visualsForPage(v, "bab-3", "teks")) === "4", "another chapter shows only its own");
assert(ids(visualsForPage(v, "bab-2", "ada Petikan lama di sini")) === "2,3,5", "an older image whose marker is in this chapter is still shown");
assert(ids(visualsForPage(v, "bab-2", "tiada")) === "2,3", "an older image whose marker is not in the chapter is not shown");

// The link preview and the page share one rule for a chapter's heading picture
assert(chapterHeroOf(v, "bab-2")?.id === 2, "a chapter's own hero is its heading picture");
assert(chapterHeroOf(v, "bab-3") === undefined, "a chapter without its own hero has none (the work's hero is the fallback)");
assert(chapterHeroOf(v, undefined) === undefined, "outside a chapter there is no chapter hero");
assert(chapterHeroOf([{ id: 9, role: "section", sectionSlug: "bab-1", anchor: "[[gambar:1]]" }], "bab-1") === undefined, "a picture tied to a marker is not the heading picture");

assert(JSON.stringify(audienceOf(undefined)) === "{}", "no audience stated: no age is published");
assert(JSON.stringify(audienceOf("Remaja")) === "{}", "words without an age range: nothing published");
const a = audienceOf("Remaja 13-17 tahun").audience as { suggestedMinAge: number; suggestedMaxAge: number };
assert(a.suggestedMinAge === 13 && a.suggestedMaxAge === 17, "a stated range is published as written");
assert(JSON.stringify(audienceOf("18-12")) === "{}", "an impossible range is ignored");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
