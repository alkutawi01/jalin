/** A novela chapter page says how long the chapter is, and keeps the whole novela's total under its own label. */
import fs from "node:fs";
import path from "node:path";
import { chapterReadingRows } from "../../src/lib/reader/reading-time";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const rows = [{ label: "Jenis", value: "Novela" }, { label: "Bacaan", value: "± 135 minit" }, { label: "Versi", value: "v2.0" }];

const chapter = chapterReadingRows(rows, 5);
assert(chapter.length === 4, "one row becomes two");
assert(chapter.some((r) => r.label === "Bab ini" && r.value === "± 5 minit"), "the chapter's own minutes");
assert(chapter.some((r) => r.label === "Novela" && r.value === "± 135 minit"), "the novela's total, labelled as such");
assert(chapter.every((r) => r.label.length <= 8), "labels fit the 78px label column of the phone info panel on one line");
assert(!chapter.some((r) => r.label === "Bacaan"), "no bare Bacaan row that could be read as the chapter's");
assert(chapter.map((r) => r.label).join() === "Jenis,Bab ini,Novela,Versi", "the order is kept");
assert(chapterReadingRows(rows, undefined) === rows, "on the novela's own page the rows are untouched");
const src = fs.readFileSync(path.join(__dirname, "..", "..", "src", "components", "reader", "WorkView.tsx"), "utf8");
assert(src.includes("chapterReadingRows(baseMeta, activeSection ?"), "WorkView applies it to the active chapter");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
