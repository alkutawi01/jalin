import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/app/page.tsx", "utf8");

assert.match(page, /<HeroCarousel slides=\{heroSlides\}/, "Pilihan Editor is rendered in the homepage hero");
assert.match(page, /editorialPicks\.map\(\(work\) => \(\{/, "every selected editor pick becomes a hero slide");
assert.doesNotMatch(page, /const featured = sorted\[0\]/, "the newest work is not promoted automatically into the hero");
assert.doesNotMatch(page, /<EditorialSelection/, "Pilihan Editor is not duplicated as a separate card section");
// "Karya Terbaru" became "Koleksi cerita" (9 Okt 2026): a random pick from the whole story pool, hero works included, so there is no duplicate list to exclude from.
assert.match(page, /pickCollection\(await buildStoryPool\(\)\)/, "Koleksi cerita is drawn at random from the whole story pool");
assert.doesNotMatch(page, /Karya Terbaru/, "the old Karya Terbaru list is gone from the homepage");

console.log("homepage editor-picks hero: passed");
