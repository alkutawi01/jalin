/**
 * Waktu Sebenar's chapters are titled only "BAB 1" … "BAB 30". The browser tab said "Bab 7: BAB 7 · Waktu Sebenar", the link to
 * the next chapter said "Seterusnya · Bab 8" over "BAB 8", and the link back said "← Bab 6: BAB 6". The number is now said once.
 */
import fs from "node:fs";
import path from "node:path";
import { chapterPageLabel, chapterTitleBesideNumber, titleRepeatsNumber } from "../src/lib/reader/chapter-label";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(titleRepeatsNumber("BAB 7", 7) && titleRepeatsNumber("bab  7", 7) && titleRepeatsNumber("Bab 07.", 7) && titleRepeatsNumber("", 7) && titleRepeatsNumber(null, 7) && titleRepeatsNumber(undefined, 7), "a title of only the chapter's own number, or none, adds nothing");
assert(!titleRepeatsNumber("BAB 8", 7) && !titleRepeatsNumber("Bab 7: Pulang", 7) && !titleRepeatsNumber("EPILOG", 31) && !titleRepeatsNumber("Babak 7", 7) && !titleRepeatsNumber("Bab 70", 7), "another number, a real title and an epilogue are titles");
assert(chapterPageLabel(7, "BAB 7") === "Bab 7" && chapterPageLabel(3, "Permulaan") === "Bab 3: Permulaan" && chapterPageLabel(31, "EPILOG") === "Bab 31: EPILOG" && chapterPageLabel(2, "") === "Bab 2", "the page title says the number once");
assert(chapterTitleBesideNumber("BAB 7", 7) === undefined && chapterTitleBesideNumber("  Pulang ", 7) === "Pulang", "the link to a chapter has a title only when the title says something");

const nav = read("src/components/reader/ReadingNav.tsx");
assert(nav.includes('{next.title ? `Seterusnya · ${next.label}` : "Seterusnya"}') && nav.includes("{next.title ?? next.label}") && nav.includes("← {prev.title ? `${prev.label}: ${prev.title}` : prev.label}"), "a link without a title shows its label alone: 'Seterusnya' over 'Bab 8', and '← Bab 6'");
const work = read("src/components/reader/WorkView.tsx");
assert(work.includes("title: chapterTitleBesideNumber(nextSection.title, sectionIndex + 2) }") && work.includes("title: chapterTitleBesideNumber(prevSection.title, sectionIndex) }"), "the chapter links of a novela leave out a title that only repeats the number");
const readerPage = read("src/app/kategori/[type]/[slug]/page.tsx");
assert(readerPage.includes("chapterPageLabel(sectionIndex + 1, visibleChapter.title)"), "the browser tab's title of an open chapter says the number once");
assert(readerPage.includes('const chapterLabel = visibleChapter ?') && readerPage.includes('const pageTitle = visibleChapter ?'), "a locked chapter's title is not exposed in the browser tab");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
