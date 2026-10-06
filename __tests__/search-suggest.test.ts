/**
 * The header search box: the icon opens a box to type in; works that fit are suggested as the reader types; the page of full
 * results is a choice at the end of the list.
 */
import fs from "node:fs";
import path from "node:path";
import { SUGGEST_LIMIT, allResultsHref, suggest } from "../src/lib/reader/search-suggest";
import type { SearchDoc } from "../src/lib/reader/search";
import { fold } from "../src/lib/reader/search";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

function doc(slug: string, title: string, type = "cerpen", authors = ["Nara Zahin"]): SearchDoc {
  return {
    kind: "work", type, slug, href: `/kategori/${type}/${slug}`, title, authors, publishedAt: "2026-10-01",
    summary: {} as SearchDoc["summary"],
    foldedTitle: fold(title), foldedDek: "", foldedGenre: "", foldedAuthors: fold(authors.join(" ")), foldedEntities: "", sections: []
  };
}
const docs = [
  doc("kerusi-di-beranda", "Kerusi di Beranda"),
  doc("kerusi-roda", "Kerusi Roda", "novela", ["Rafiq Naim", "Nara Zahin"]),
  ...Array.from({ length: 10 }, (_, i) => doc(`kerusi-${i}`, `Kerusi Nombor ${i}`)),
  doc("hujan", "Hujan Petang")
];

const found = suggest(docs, "kerusi");
assert(found.length === SUGGEST_LIMIT, `at most ${SUGGEST_LIMIT} suggestions however many works fit`);
assert(suggest(docs, "hujan").length === 1 && suggest(docs, "hujan")[0].title === "Hujan Petang", "a title is suggested for what is typed");
assert(suggest(docs, "").length === 0 && suggest(docs, "   ").length === 0, "nothing is suggested for a blank box");
assert(suggest(docs, "😀").length === 0 && suggest(docs, "zzzzqqq").length === 0, "nothing is suggested when nothing fits");
const first = suggest(docs, "kerusi roda")[0];
assert(first.typeLabel === "Novela" && first.authors === "Rafiq Naim & Nara Zahin" && first.href === "/kategori/novela/kerusi-roda", "a suggestion shows the kind, who wrote it and where it is");
assert(Object.keys(first).sort().join() === "authors,href,title,typeLabel", "a suggestion carries only what a public card shows");
assert(suggest(docs, "x".repeat(5000)).length === 0, "a very long query is cut, not a problem");

assert(allResultsHref("kerusi roda") === "/cari?q=kerusi%20roda" && allResultsHref("  ") === "/cari" && allResultsHref("a&b=c") === "/cari?q=a%26b%3Dc", "the page of full results is reached with the query made safe");

const box = read("src/components/reader/HeaderSearch.tsx");
assert(box.includes("event.preventDefault();\n    setOpen") && box.includes('href="/cari"'), "the icon opens the box, and is still a link to the search page when script does not run");
assert(box.includes('event.key === "Escape"') && box.includes("ArrowDown") && box.includes("ArrowUp"), "Escape closes the box; arrow keys move through the suggestions");
assert(box.includes("controller.abort()") && box.includes("}, 200)"), "typing waits a moment and drops an answer that is no longer wanted");
assert(box.includes("Lihat semua hasil untuk"), "the last choice goes to all results");
assert(box.includes('role="combobox"') && box.includes("aria-activedescendant"), "the box is a combobox for screen readers");
assert(read("src/components/reader/StoryChrome.tsx").includes("<HeaderSearch"), "the header uses the search box");
const route = read("src/app/api/cari/cadangan/route.ts");
assert(route.includes("export async function GET") && !route.includes("POST") && route.includes("suggest("), "the suggestion endpoint is read-only");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
