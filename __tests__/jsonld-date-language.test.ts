/**
 * Audit findings on the structured data: dateModified was earlier than datePublished on three live pages, and inLanguage was always "ms"
 * even for the fragmen published in Indonesian (Hamka's text).
 */
import fs from "node:fs";
import path from "node:path";
import { laterOf, seriesJsonLd, workJsonLd, type JsonLdWork } from "../src/lib/seo-jsonld";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
assert(laterOf("2026-09-26T00:00:00Z", "2026-10-02T11:00:00Z") === "2026-10-02T11:00:00Z", "a modified date before the published date becomes the published date");
assert(laterOf("2026-10-05T00:00:00Z", "2026-10-02T11:00:00Z") === "2026-10-05T00:00:00Z", "a later modified date is kept");
assert(laterOf("2026-10-05", undefined) === "2026-10-05" && laterOf("bukan tarikh", "2026-10-02") === "bukan tarikh", "no published date, or text that is not a date: unchanged");

const base: JsonLdWork = { slug: "a", title: "A", type: "fragmen", authors: [], sections: [], publishedAt: "2026-10-02T11:00:00Z", updatedAt: "2026-09-26T00:00:00Z" };
const graph = (w: JsonLdWork) => (workJsonLd(w) as { "@graph": Array<Record<string, unknown>> })["@graph"][0]!;
assert(graph(base).dateModified === "2026-10-02T11:00:00Z", "the page's structured data never says it was modified before it was published");
assert(graph(base).inLanguage === "ms" && graph({ ...base, inLanguage: "id" }).inLanguage === "id", "Malay unless the work says it is published in Indonesian");
const view = fs.readFileSync(path.join(__dirname, "../src/components/reader/WorkView.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(view.includes('inLanguage: isIndonesianLanguage(work.metadata?.fragmenTextLanguage) ? "id" : "ms"'), "the work page passes the language of the published text");

// A series page shows a byline, so its structured data names the same writers.
const seriesNode = (authors?: string[]) => (seriesJsonLd({ slug: "s", title: "S", authors, episodes: [] }) as { "@graph": Array<Record<string, unknown>> })["@graph"][0]!;
assert(JSON.stringify(seriesNode(["Nara Zahin", "Rafiq Naim"]).author).includes("Rafiq Naim") && seriesNode([]).author === undefined && seriesNode().author === undefined, "a series' structured data names the writers of its byline, and nothing when there are none");
assert(fs.readFileSync(path.join(__dirname, "../src/app/kategori/bersiri/[seriesSlug]/page.tsx"), "utf8").includes("authors: authors.map((author) => author.name)"), "the series page passes them");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
