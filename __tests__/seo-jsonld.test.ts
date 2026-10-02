/** Structured data for work and chapter pages. */
import { jsonLdString, workJsonLd } from "../src/lib/seo-jsonld";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const novela = {
  slug: "bunga", title: "Bunga <b>", type: "novela", dek: "Dek.", genre: "Fiksyen Sains",
  publishedAt: "2026-09-29", heroSrc: "https://x.test/a.png", authors: ["Nara Zahin"],
  sections: [{ slug: "bab-1", title: "Satu" }, { slug: "bab-2", title: "Dua" }, { slug: "bab-3" }]
};

const book = workJsonLd(novela) as { "@graph": Array<Record<string, unknown>> };
const b = book["@graph"][0]!;
assert(b["@type"] === "Book" && (b.hasPart as unknown[]).length === 3, "novela is a Book with its chapters");
assert((b.hasPart as Array<{ name: string }>)[2]!.name === "Bab 3", "a chapter without a title is called Bab N");
assert(b.inLanguage === "ms" && b.isAccessibleForFree === true, "language and free access are stated");
assert(book["@graph"][1]!["@type"] === "BreadcrumbList", "a breadcrumb list follows");

const chapter = workJsonLd(novela, "bab-2") as { "@graph": Array<Record<string, unknown>> };
const c = chapter["@graph"][0]!;
assert(c["@type"] === "Chapter" && c.position === 2 && c.name === "Dua", "a chapter page describes that chapter");
assert((c.isPartOf as { "@id": string })["@id"].endsWith("/kategori/novela/bunga#book"), "the chapter points at its book");

const cerpen = workJsonLd({ ...novela, type: "cerpen", sections: [] }) as { "@graph": Array<Record<string, unknown>> };
assert(cerpen["@graph"][0]!["@type"] === "ShortStory", "a cerpen is a ShortStory");

const text = jsonLdString(novela);
assert(!text.includes("<"), "'<' is escaped so the data cannot close the script tag");
assert(JSON.parse(text).title === "Bunga <b>", "escaped data still parses back to the original");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
