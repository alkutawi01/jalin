import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/app/page.tsx", "utf8");

assert.match(page, /<HeroCarousel slides=\{heroSlides\}/, "Pilihan Editor is rendered in the homepage hero");
assert.match(page, /editorialPicks\.map\(\(work\) => \(\{/, "every selected editor pick becomes a hero slide");
assert.doesNotMatch(page, /const featured = sorted\[0\]/, "the newest work is not promoted automatically into the hero");
assert.doesNotMatch(page, /<EditorialSelection/, "Pilihan Editor is not duplicated as a separate card section");
assert.match(page, /new Set<string>\(editorialPicks\.map/, "hero works are excluded from Karya Terbaru duplicates");

console.log("homepage editor-picks hero: passed");
