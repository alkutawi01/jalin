/** Structured data for work and chapter pages. */
import { absoluteUrl } from "../src/lib/seo";
import { episodeJsonLd, jsonLdString, seriesJsonLd, workJsonLd } from "../src/lib/seo-jsonld";

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

const blob = "https://abc.public.blob.vercel-storage.com/assets/a.png";
assert(absoluteUrl("/visuals/a/hero.png").endsWith("/visuals/a/hero.png") && !absoluteUrl("/visuals/a/hero.png").includes("://" + "https"), "a path on the site becomes a full address");
assert(absoluteUrl(blob) === blob, "an address that is already full is not prefixed with the site again");
assert(absoluteUrl("HTTP://x.test/a.png") === "HTTP://x.test/a.png", "the check ignores letter case");
const imageOfWork = (workJsonLd({ ...novela, heroSrc: blob }) as { "@graph": Array<Record<string, unknown>> })["@graph"][0]!.image;
assert(imageOfWork === blob, "structured data points at the real image, not a doubled address");

const series = seriesJsonLd({ slug: "siri-a", title: "Siri A", dek: "Dek.", episodes: [{ slug: "ep-1", title: "Satu", position: 1 }, { slug: "ep-2", title: "Dua", position: 2 }] }) as { "@graph": Array<Record<string, unknown>> };
assert(series["@graph"][0]!["@type"] === "CreativeWorkSeries" && (series["@graph"][0]!.hasPart as unknown[]).length === 2, "a series lists its episodes");
assert(series["@graph"][1]!["@type"] === "BreadcrumbList", "a series has a breadcrumb");

const episode = episodeJsonLd({ ...novela, type: "bersiri", slug: "ep-2", title: "Dua", sections: [], audience: undefined }, { slug: "siri-a", title: "Siri A" }, 2) as { "@graph": Array<Record<string, unknown>> };
const ep = episode["@graph"][0]!;
assert(ep.position === 2 && (ep.isPartOf as { name: string }).name === "Siri A", "an episode says its position and its series");
assert(!("audience" in ep), "no age range is published when the work states none");
assert((episode["@graph"][1]!.itemListElement as unknown[]).length === 4, "the episode breadcrumb runs Jalin, Bersiri, series, episode");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
