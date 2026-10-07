/**
 * Words taken from an address were used as keys of plain objects. "toString" and "constructor" are properties of every object, so
 * /cari?bacaan=toString called a function that has no .test (a server error, 500 on production) and /kategori/constructor was taken
 * for a category (an empty page answered 200). The same fault /penulis/<name> had, fixed there earlier.
 */
import fs from "node:fs";
import path from "node:path";
import { filterDocs, READING_BANDS, type SearchDoc } from "../src/lib/reader/search";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const docs = [
  { type: "cerpen", genre: "x", authors: ["A"], readingMinutes: 5 },
  { type: "novela", genre: "y", authors: ["B"], readingMinutes: 40 },
  { type: "cerpen", genre: "x", authors: ["A"], readingMinutes: undefined },
] as unknown as SearchDoc[];

for (const word of ["toString", "constructor", "hasOwnProperty", "__proto__", "valueOf", "isPrototypeOf"]) {
  let result: SearchDoc[] | string;
  try { result = filterDocs(docs, { bacaan: word }); } catch (error) { result = (error as Error).message; }
  assert(Array.isArray(result) && result.length === 3, `bacaan=${word} filters nothing (it is not a reading band)`, result);
}
assert(filterDocs(docs, { bacaan: "pendek" }).length === 1 && filterDocs(docs, { bacaan: "panjang" }).length === 1, "the real bands still filter");
assert(Object.keys(READING_BANDS).join() === "pendek,sederhana,panjang", "there are three bands");

const page = read("src/app/kategori/[type]/page.tsx");
assert(page.includes("function categoryMeta(type: string)") && page.includes("Object.prototype.hasOwnProperty.call(CATEGORY_META, type)"), "a category is looked up by its own keys only");
assert(!/CATEGORY_META\[type\]/.test(page.replace(/function categoryMeta[\s\S]*?\n}\n/, "")), "and nothing else indexes it by the address");
assert(read("src/lib/reader/search.ts").includes("Object.prototype.hasOwnProperty.call(READING_BANDS, band)"), "a reading band likewise");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
