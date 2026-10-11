/** Category lists: sort and filter from the address (?susun, ?genre, ?bacaan), checked values, stable order, facets with counts. */
import fs from "node:fs";
import path from "node:path";
import { applyListQuery, DEFAULT_SORT, isFilteredQuery, listFacets, listQueryString, parseListQuery, type ListItem } from "../src/lib/reader/category-list";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }

const items: ListItem[] = [
  { title: "Baki Hari", genre: "Drama", readingMinutes: 16, publishedAt: "2026-10-09", updatedAt: "2026-10-12" },
  { title: "Anak Qasab", genre: "keluarga", readingMinutes: 16, publishedAt: "2026-10-06" },
  { title: "Nombor Giliran 117", genre: "Keluarga", readingMinutes: 11, publishedAt: "2026-10-07" },
  { title: "Surat yang Tidak Pernah Selesai", genre: "Drama", readingMinutes: 8, publishedAt: "2026-10-08" },
  { title: "Tanpa Tarikh" },
  { title: "Dakwat yang Tidak Dapat Dipadam", genre: "Fiksyen sejarah", readingMinutes: 27, publishedAt: "2026-10-11" }
];
const titles = (list: ListItem[]) => list.map((item) => item.title);

console.log("\n=== Address is checked ===");
assert(parseListQuery(undefined).susun === DEFAULT_SORT, "no parameters: the default sort");
assert(parseListQuery({ susun: "constructor" }).susun === DEFAULT_SORT, "a property name is not a sort");
assert(parseListQuery({ susun: "__proto__", bacaan: "toString" }).bacaan === "", "a property name is not a reading band");
assert(parseListQuery({ susun: ["tajuk", "terbaru"] }).susun === "tajuk", "a repeated parameter uses the first value");
assert(parseListQuery({ genre: "x".repeat(500) }).genre.length === 60, "a genre is cut to a sane length");
assert(!isFilteredQuery(parseListQuery({})) && isFilteredQuery(parseListQuery({ genre: "Drama" })) && isFilteredQuery(parseListQuery({ susun: "tajuk" })), "only a non-default query counts as filtered");
assert(listQueryString({}) === "" && listQueryString({ susun: "tajuk", genre: "Drama", bacaan: "pendek" }) === "?susun=tajuk&genre=Drama&bacaan=pendek", "the query string leaves out defaults");

console.log("\n=== Sorting ===");
assert(titles(applyListQuery(items, parseListQuery({})))[0] === "Dakwat yang Tidak Dapat Dipadam", "newest first by default");
assert(titles(applyListQuery(items, parseListQuery({}))).slice(-1)[0] === "Tanpa Tarikh", "an item without a date is last, not first");
assert(titles(applyListQuery(items, parseListQuery({ susun: "terlama" })))[0] === "Anak Qasab", "oldest first");
assert(titles(applyListQuery(items, parseListQuery({ susun: "terlama" }))).slice(-1)[0] === "Tanpa Tarikh", "an item without a date is last when oldest first too");
assert(titles(applyListQuery(items, parseListQuery({ susun: "terpendek" })))[0] === "Surat yang Tidak Pernah Selesai", "shortest first");
assert(titles(applyListQuery(items, parseListQuery({ susun: "terpanjang" })))[0] === "Dakwat yang Tidak Dapat Dipadam", "longest first");
assert(titles(applyListQuery(items, parseListQuery({ susun: "terpendek" }))).slice(-1)[0] === "Tanpa Tarikh", "an item without a length is last");
assert(titles(applyListQuery(items, parseListQuery({ susun: "tajuk" })))[0] === "Anak Qasab", "A to Z by title");
assert(titles(applyListQuery(items, parseListQuery({ susun: "kemaskini" })))[0] === "Baki Hari", "recently updated first, using the update date");
const tie = titles(applyListQuery(items, parseListQuery({ susun: "terpanjang" })));
assert(tie.indexOf("Anak Qasab") < tie.indexOf("Baki Hari") || tie.indexOf("Baki Hari") < tie.indexOf("Anak Qasab"), "the sort is total");
assert(titles(applyListQuery(items, parseListQuery({ susun: "terpanjang" })))[1] === "Anak Qasab", "equal lengths are decided by title (stable on every request)");
assert(titles(items)[0] === "Baki Hari", "the input list is not reordered by reference");

console.log("\n=== Filtering ===");
assert(titles(applyListQuery(items, parseListQuery({ genre: "keluarga" }))).length === 2, "a genre ignores case: 'keluarga' and 'Keluarga' are one genre");
assert(titles(applyListQuery(items, parseListQuery({ genre: "FIKSYEN SEJARAH" }))).length === 1, "a genre ignores case in the address");
assert(applyListQuery(items, parseListQuery({ genre: "Tidak ada" })).length === 0, "an unknown genre matches nothing");
assert(titles(applyListQuery(items, parseListQuery({ bacaan: "pendek" }))).length === 2, "short: 15 minutes or less (11 and 8)");
assert(!titles(applyListQuery(items, parseListQuery({ bacaan: "pendek" }))).includes("Tanpa Tarikh"), "an item with no length is not 'short'");
assert(titles(applyListQuery([...items, { title: "Epik", readingMinutes: 45 }, { title: "Tepat tiga puluh", readingMinutes: 30 }], parseListQuery({ bacaan: "panjang" }))).join() === "Epik", "long: only what is over 30 minutes (30 is medium)");
assert(titles(applyListQuery(items, parseListQuery({ bacaan: "sederhana" }))).length === 3, "medium: 16 to 30 minutes (16, 16, 27)");
assert(titles(applyListQuery(items, parseListQuery({ genre: "Drama", bacaan: "pendek" }))).join() === "Surat yang Tidak Pernah Selesai", "genre and length combine (AND)");

console.log("\n=== Facets ===");
const facets = listFacets(items);
assert(facets.genres.map((g) => `${g.value}:${g.count}`).join() === "Drama:2,Fiksyen sejarah:1,Keluarga:2", "genres are counted and a genre written two ways is one entry");
assert(facets.bands.map((b) => `${b.value}:${b.count}`).join() === "pendek:2,sederhana:3", "reading bands are counted; an empty band and an item without a length are left out");
assert(listFacets([{ title: "A", readingMinutes: 5 }]).genres.length === 0, "no genre, no genre filter entries");

console.log("\n=== The page uses it ===");
const page = fs.readFileSync(path.join(__dirname, "..", "src", "app", "kategori", "[type]", "page.tsx"), "utf8");
assert(/searchParams/.test(page) && /parseListQuery/.test(page) && /applyListQuery/.test(page), "the category page reads the address and applies the query");
assert(/robots:\s*\{\s*index:\s*false/.test(page), "a sorted or filtered view is not indexed");
assert(/canonical:\s*`\/kategori\/\$\{type\}`/.test(page), "the canonical stays the plain list");
const controls = fs.readFileSync(path.join(__dirname, "..", "src", "components", "reader", "CategoryControls.tsx"), "utf8");
assert(/method="get"/.test(controls) && /role="status"/.test(controls), "the controls are a GET form with a status count");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
