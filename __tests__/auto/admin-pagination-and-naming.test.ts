/** The admin list of contents is cut into pages of 50, the activity list can be read further back, and the list is called "Senarai kandungan". */
import fs from "node:fs";
import path from "node:path";
import { paginate } from "../../src/lib/reader/category-list";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

const sixtyTwo = Array.from({ length: 62 }, (_, i) => i);
const first = paginate(sixtyTwo, 1, 50);
const second = paginate(sixtyTwo, 2, 50);
assert(first.items.length === 50 && first.pages === 2, "62 contents are two pages: 50 and 12");
assert(second.items.length === 12 && second.items[0] === 50, "the second page starts where the first stopped");
assert(paginate(sixtyTwo, 9, 50).page === 2, "a page past the end falls back to the last");

const works = read("src", "app", "admin", "works", "page.tsx");
assert(works.includes("const WORKS_PAGE_SIZE = 50;") && works.includes("paginate(works, requestedPage, WORKS_PAGE_SIZE)"), "the works page is cut into pages of 50");
assert(works.includes("redirect(hrefForPage(paged.page))"), "a page past the end goes to the last real page");
assert(works.includes("<AdminPagination") && works.indexOf("<AdminPagination") < works.indexOf("<AdminWorksTable"), "page links are above the table (and again under it)");
assert(works.includes("summarizeReadiness(pageWorks.filter"), "readiness is worked out only for the page shown");
assert(works.includes("<h1>Senarai kandungan</h1>") && works.includes("{works.length} kandungan"), "the page is called Senarai kandungan");

assert(read("src", "components", "admin", "AdminShell.tsx").includes('label: "Kandungan",'), "the menu item is Kandungan");
assert(read("src", "app", "admin", "page.tsx").includes("Lihat senarai kandungan") && read("src", "app", "admin", "works", "[id]", "page.tsx").includes("senarai kandungan terbit"), "the links in the admin say so too");
assert(!/senarai karya/i.test(read("src", "app", "admin", "page.tsx")), "no 'senarai karya' left on the dashboard");

const activity = read("src", "lib", "admin", "activity.ts");
const aktiviti = read("src", "app", "admin", "aktiviti", "page.tsx");
assert(activity.includes(".offset(Math.max(filter.offset ?? 0, 0))"), "the activity query can skip rows");
assert(aktiviti.includes("limit: ACTIVITY_PAGE_SIZE + 1") && aktiviti.includes("Lebih lama ›") && aktiviti.includes("‹ Lebih baharu"), "the activity page offers older and newer");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
