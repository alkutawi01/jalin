/** ?halaman= past the last page goes to the last page. It used to render the last page again under its own title and canonical: unlimited duplicates. */
import fs from "node:fs";
import path from "node:path";
import { pageQueryString, paginate, parsePage } from "../../src/lib/reader/category-list";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const items = Array.from({ length: 15 }, (_, i) => i);
const past = paginate(items, parsePage({ halaman: "999" }));
assert(past.pages === 2 && past.page === 2 && 999 > past.page, "page 999 of a 2-page list is clamped to 2, so the page can tell it was past the end");
assert(pageQueryString({}, past.page) === "?halaman=2", "the address to send the reader to is the real last page");
const one = paginate([1, 2, 3], parsePage({ halaman: "5" }));
assert(one.page === 1 && pageQueryString({}, one.page) === "", "a one-page list goes to the plain address");

const src = fs.readFileSync(path.join(__dirname, "..", "..", "src", "app", "kategori", "[type]", "page.tsx"), "utf8");
const hits = src.split("requestedPage > paged.page").length - 1;
assert(hits === 2, "both the series list and the works list redirect a page past the end");
assert(/import \{ notFound, redirect \} from "next\/navigation"/.test(src), "redirect is imported");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
