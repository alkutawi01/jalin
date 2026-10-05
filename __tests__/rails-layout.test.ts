/**
 * The two side columns of a story page (Izzat):
 *  - "Tentang karya" and "Editorial" on the left; "Watak" (and "Latar tempat") alone on the right;
 *  - both start level with the first paragraph, not with the page header (on a chapter page the chapter head and its picture
 *    used to sit inside the middle column, so the side columns began at the breadcrumb);
 *  - one "Senarai Bab" on a chapter page, not two.
 * Checked in a browser on a temporary Neon branch: the first paragraph and both columns all started at the same height.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const chrome = read("src/components/reader/StoryChrome.tsx");
const left = chrome.slice(chrome.indexOf("export function LeftRail"), chrome.indexOf("export function RightRail"));
const right = chrome.slice(chrome.indexOf("export function RightRail"), chrome.indexOf("export function EditorNote"));
assert(left.includes("Tentang karya") && left.includes(">Editorial<"), "the left column holds Tentang karya and Editorial");
assert(right.includes(">Watak<") && right.includes("Latar tempat") && !right.includes("Editorial"), "the right column holds Watak and Latar tempat, not Editorial");

const story = read("src/app/kategori/[type]/[slug]/page.tsx");
const topGrid = story.indexOf("chapter-top");
const bodyGrid = story.indexOf("<LeftRail");
assert(topGrid > 0 && topGrid < bodyGrid, "a chapter's head and picture are above the columns");
const afterTop = story.slice(topGrid, bodyGrid);
assert(afterTop.includes("<ChapterHead") && afterTop.includes("kind=\"hero\""), "the chapter head and its picture are in that top block");
const columns = story.slice(bodyGrid);
assert(!columns.slice(0, columns.indexOf("<RightRail")).includes("<ChapterHead"), "the chapter head is not repeated inside the columns");
assert(story.includes("landing || sectionIndex >= 0 ? null : <SectionIndexDetails"), "a chapter page does not repeat Senarai Bab in the left column");
assert(story.includes("editorial={editorial}") && !story.includes("<RightRail characters={characters} editorial="), "Editorial goes to the left column");

const episode = read("src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx");
assert(episode.includes("editorial={editorial}") && !episode.includes("<RightRail characters={characters} editorial="), "a series episode follows the same columns");

const chapters = read("src/components/reader/NovelaChapters.tsx");
const intro = chapters.slice(chapters.indexOf("export function NovelaIntro"));
assert(!intro.includes("hero-featured-cta") && !intro.includes("Baca sekarang"), "a novela page has no separate read button: a reader picks a chapter from the list");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
