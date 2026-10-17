import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The card is one component: the category list and the start page must not draw cards of their own again.
const read = (path: string) => readFileSync(path, "utf8");
const category = read("src/app/kategori/[type]/page.tsx");
const start = read("src/app/mula/page.tsx");
const card = read("src/components/reader/StoryCollection.tsx");

assert.ok(category.includes("StoryCardView"), "category list uses the shared card");
assert.ok(start.includes("StoryCardView"), "start page uses the shared card");
assert.ok(!category.includes('className="latest-card"') && !start.includes('className="latest-card"'), "no page draws its own latest-card");
assert.ok(!category.includes("latest-card-reading") && !start.includes("latest-card-reading"), "country and reading time are not pills on the eyebrow");
assert.ok(card.includes("Baca →") && !card.includes("Baca sekarang"), "the card button reads 'Baca →'");
assert.ok(card.includes("Daripada {card.seriesTitle}"), "an episode card names its series");
console.log("one-card test passed");
