/** Category lists: sort and filter from the address (?susun, ?genre, ?bacaan), checked values, stable order, facets with counts. */
import fs from "node:fs";
import path from "node:path";
import { applyListQuery, DEFAULT_SORT, isFilteredQuery, listFacets, listQueryString, pageQueryString, PAGE_SIZE, paginate, parseListQuery, parsePage, type ListItem } from "../src/lib/reader/category-list";

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

console.log("\n=== Audience and status ===");
const people: ListItem[] = [
  { title: "Untuk remaja", audience: "remaja" },
  { title: "Belia dan dewasa", audience: "belia,dewasa" },
  { title: "Julat lama", audience: "13-17" },
  { title: "Tanpa audiens" },
  { title: "Siri masih jalan", status: "ongoing" },
  { title: "Siri tamat", status: "completed" },
  { title: "Siri status lain", status: "paused" }
];
assert(parseListQuery({ umur: "remaja" }).umur === "remaja" && parseListQuery({ umur: "REMAJA" }).umur === "remaja", "a known audience band is accepted, in any case");
assert(parseListQuery({ umur: "constructor" }).umur === "" && parseListQuery({ umur: "orang-tua" }).umur === "", "an unknown audience or a property name is no filter");
assert(parseListQuery({ umur: "pelajar" }, [{ code: "pelajar", label: "Pelajar", min: 13, max: 24 }]).umur === "pelajar", "bands come from the editor list, not a fixed one");
assert(parseListQuery({ status: "tamat" }).status === "tamat" && parseListQuery({ status: "completed" }).status === "" && parseListQuery({ status: "toString" }).status === "", "status is one of the two words, nothing else");
assert(isFilteredQuery(parseListQuery({ umur: "remaja" })) && isFilteredQuery(parseListQuery({ status: "tamat" })), "audience and status count as filtered");
assert(listQueryString({ umur: "remaja", status: "tamat" }) === "?umur=remaja&status=tamat", "they appear in the query string");
assert(titles(applyListQuery(people, parseListQuery({ umur: "remaja" }))).sort().join() === "Julat lama,Untuk remaja", "audience: a band code and an old age range both count");
assert(titles(applyListQuery(people, parseListQuery({ umur: "dewasa" }))).join() === "Belia dan dewasa", "audience: a work for several bands is found under each");
assert(titles(applyListQuery(people, parseListQuery({ status: "tamat" }))).join() === "Siri tamat", "status: completed");
assert(titles(applyListQuery(people, parseListQuery({ status: "berterusan" }))).sort().join() === "Siri masih jalan,Siri status lain", "status: anything not completed is still going on");
const pf = listFacets(people);
assert(pf.audiences.map((a) => a.code + ":" + a.count).join() === "remaja:2,belia:1,dewasa:1", "audience facets are counted per band");
assert(pf.statuses.map((s) => s.value + ":" + s.count).join() === "berterusan:2,tamat:1", "status facets are counted; an item without status is in neither");
assert(listFacets([{ title: "A" }]).audiences.length === 0 && listFacets([{ title: "A" }]).statuses.length === 0, "no audience and no status, no entries");

console.log("\n=== Pages ===");
const many = Array.from({ length: 30 }, (_, i) => ({ title: "Karya " + String(i + 1).padStart(2, "0") }));
assert(PAGE_SIZE === 12, "a page holds 12");
assert(parsePage(undefined) === 1 && parsePage({}) === 1 && parsePage({ halaman: "2" }) === 2 && parsePage({ halaman: ["3", "4"] }) === 3, "the page comes from ?halaman=");
assert(parsePage({ halaman: "0" }) === 1 && parsePage({ halaman: "-2" }) === 1 && parsePage({ halaman: "1.5" }) === 1 && parsePage({ halaman: "abc" }) === 1 && parsePage({ halaman: "99999999999" }) === 1, "anything that is not a whole number from 1 is the first page");
const first = paginate(many, 1);
assert(first.items.length === 12 && first.pages === 3 && first.page === 1 && first.total === 30, "30 items make 3 pages of 12");
assert(paginate(many, 3).items.length === 6 && paginate(many, 3).items[0].title === "Karya 25", "the last page holds the rest");
assert(paginate(many, 99).page === 3 && paginate(many, 99).items.length === 6, "a page past the end shows the last page");
assert(paginate([], 5).pages === 1 && paginate([], 5).page === 1 && paginate([], 5).items.length === 0, "an empty list is one empty page");
assert(paginate(many.slice(0, 12), 1).pages === 1, "exactly a page is one page");
assert(pageQueryString({}, 1) === "" && pageQueryString({}, 2) === "?halaman=2", "the first page has no parameter");
assert(pageQueryString({ genre: "Drama", susun: "tajuk" }, 3) === "?susun=tajuk&genre=Drama&halaman=3", "a page keeps the choices of the list");

console.log("\n=== The page uses it ===");
const page = fs.readFileSync(path.join(__dirname, "..", "src", "app", "kategori", "[type]", "page.tsx"), "utf8");
assert(/searchParams/.test(page) && /parseListQuery/.test(page) && /applyListQuery/.test(page), "the category page reads the address and applies the query");
assert(/robots:\s*\{\s*index:\s*false/.test(page), "a sorted or filtered view is not indexed");
assert(page.includes("alternates: { canonical }") && page.includes("`/kategori/${type}`") && /const canonical = !filtered/.test(page), "a sorted or filtered view keeps the plain list as its canonical");
const controls = fs.readFileSync(path.join(__dirname, "..", "src", "components", "reader", "CategoryControls.tsx"), "utf8");
assert(/method="get"/.test(controls) && /role="status"/.test(controls), "the controls are a GET form with a status count");
assert(/name="umur"/.test(controls) && /name="status"/.test(controls), "the controls offer audience and series status");
const projection = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "reader", "public-projection.ts"), "utf8");
assert(/audience\?: string/.test(projection), "the public summary carries the audience for filtering");
const labelSites = ["src/app/kategori/[type]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/page.tsx", "src/components/reader/EpisodeView.tsx"].map((p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8"));
assert(labelSites.every((text) => text.includes("seriesStatusLabel") && !text.split("\n").some((line) => line.includes("Masih diteruskan") && !line.includes("*/") && !line.includes("/*"))), "the reader pages use one wording for a series status (comments aside)");

const nav = fs.readFileSync(path.join(__dirname, "..", "src", "components", "reader", "CategoryPagination.tsx"), "utf8");
assert(nav.includes('aria-label="Halaman senarai"') && nav.includes('rel="prev"') && nav.includes('rel="next"') && nav.includes('aria-current="page"'), "pagination is a labelled nav of real links, with prev, next and the current page marked");
assert(!/onClick|useState|"use client"/.test(nav), "pagination needs no JavaScript");
assert(/<ul className="latest-grid category-grid" role="list"/.test(page) && /<ul className="work-list" role="list"/.test(page) && page.includes("<li key="), "the cards are list items of a list (works and series)");
assert(/EmptyCategoryFallback currentType=\{type\} \/> : null\}\s*\{summaries\.length > 0/.test(page) || page.indexOf("<EmptyCategoryFallback currentType={type} />") < page.indexOf('<ul className="latest-grid category-grid"'), "the empty state sits outside the list, not inside the grid");
assert(page.includes("priority={index < 3}") && page.includes("priority={index < 2}"), "the first pictures load at once (above the fold), the rest lazily");
assert(/canonical = !filtered && page > 1/.test(page), "a later page of the plain list is canonical to itself");
const cover = fs.readFileSync(path.join(__dirname, "..", "src", "components", "reader", "WorkCover.tsx"), "utf8");
assert(cover.includes("priority?: boolean") && cover.includes("priority={priority}"), "the cover can be loaded first");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
