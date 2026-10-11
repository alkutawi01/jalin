/** Category lists: structured data (CollectionPage + ItemList + breadcrumb), the description with a count, and the RSS feed of new works. */
import fs from "node:fs";
import path from "node:path";
import { buildRss, FEED_LIMIT, xmlEscape, type FeedItem } from "../src/lib/reader/rss";
import { categoryJsonLd, jsonLdString } from "../src/lib/seo-jsonld";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").split("\r\n").join("\n");

console.log("\n=== Structured data ===");
const ld = categoryJsonLd({
  type: "cerpen",
  title: "Senarai cerpen",
  description: "Cerita pendek.",
  items: [{ name: "Satu", path: "/kategori/cerpen/satu" }, { name: "Dua", path: "/kategori/cerpen/dua" }]
}) as { "@context": string; "@graph": Record<string, any>[] };
const page = ld["@graph"].find((node) => node["@type"] === "CollectionPage")!;
const crumbs = ld["@graph"].find((node) => node["@type"] === "BreadcrumbList")!;
assert(ld["@context"] === "https://schema.org", "schema.org context");
assert(page && page.mainEntity["@type"] === "ItemList" && page.mainEntity.numberOfItems === 2, "the page is a CollectionPage whose main entity is an ItemList of the works");
assert(page.mainEntity.itemListElement[1].position === 2 && /^https?:\/\/.+\/kategori\/cerpen\/dua$/.test(page.mainEntity.itemListElement[1].url), "each item has a position and a full address");
assert(crumbs.itemListElement.length === 2 && crumbs.itemListElement[1].name === "Cerpen", "the breadcrumb is Jalin then the category");
assert(!jsonLdString({ name: "</script><b>" }).includes("</script>"), "the script can never be closed by the data");

console.log("\n=== RSS ===");
assert(xmlEscape(`A & B <C> "D" 'E'`) === "A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;", "the five XML characters are escaped");
assert(xmlEscape("a\u0001b\u000Bc") === "abc", "control characters XML does not allow are removed");
const items: FeedItem[] = [
  { title: "Lama", path: "/kategori/cerpen/lama", publishedAt: "2026-10-01", category: "Cerpen" },
  { title: "Baru & <hebat>", path: "/kategori/cerpen/baru", publishedAt: "2026-10-11T08:00:00Z", dek: "Ringkasan \"ini\"", category: "Cerpen" },
  { title: "Tanpa tarikh", path: "/kategori/cerpen/tiada" },
  { title: "Tarikh rosak", path: "/kategori/cerpen/rosak", publishedAt: "bukan tarikh" }
];
const xml = buildRss(items, new Date("2026-10-12T00:00:00Z"));
assert(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>') && xml.includes('<rss version="2.0"'), "an RSS 2.0 document");
assert(xml.indexOf("Baru &amp; &lt;hebat&gt;") > 0 && xml.indexOf("Baru &amp;") < xml.indexOf("<title>Lama</title>"), "newest first, with the title escaped");
assert(!xml.includes("Tanpa tarikh") && !xml.includes("Tarikh rosak"), "an item with no usable date is left out");
assert(xml.includes('<guid isPermaLink="true">') && /<link>https?:\/\/[^<]+\/kategori\/cerpen\/baru<\/link>/.test(xml), "each item has a full link and a permanent guid");
assert(xml.includes("<pubDate>Sun, 11 Oct 2026 08:00:00 GMT</pubDate>") && xml.includes("<lastBuildDate>Sun, 11 Oct 2026 08:00:00 GMT</lastBuildDate>"), "dates are RFC 822; the channel date is the newest item");
assert(xml.includes("<description>Ringkasan &quot;ini&quot;</description>") && xml.includes("<category>Cerpen</category>"), "the dek and the category are carried, escaped");
const many: FeedItem[] = Array.from({ length: FEED_LIMIT + 10 }, (_, i) => ({ title: `K${i}`, path: `/kategori/cerpen/k${i}`, publishedAt: `2026-09-${String((i % 28) + 1).padStart(2, "0")}` }));
assert((buildRss(many).match(/<item>/g) ?? []).length === FEED_LIMIT, `the feed holds at most ${FEED_LIMIT} items`);
assert(buildRss([], new Date("2026-10-12T00:00:00Z")).includes("<lastBuildDate>Mon, 12 Oct 2026 00:00:00 GMT</lastBuildDate>"), "an empty feed is still a valid document");

console.log("\n=== Wiring ===");
const listing = read("src/app/kategori/[type]/page.tsx");
assert(listing.includes("categoryJsonLd(") && listing.split("application/ld+json").length - 1 === 2, "both kinds of list (works and series) carry the structured data");
assert(listing.includes("<Breadcrumb") && listing.includes('aria-label="Jejak halaman"') && listing.includes('aria-current="page"'), "a visible breadcrumb, with the current page marked");
assert(listing.includes("categorySummary(") && listing.includes("shareImage(summary.heroSrc"), "the share picture is the newest work's, the Jalin card when there is none");
assert(listing.includes("diterbitkan.`"), "the description says how many are published");
const layout = read("src/app/layout.tsx");
assert(layout.includes('"application/rss+xml": "/feed.xml"'), "every page advertises the feed");
const route = read("src/app/feed.xml/route.ts");
assert(route.includes("export const revalidate") && route.includes("application/rss+xml") && route.includes("getPublishedSeriesEpisodes"), "the feed is cached, typed, and lists series episodes too");
assert(!/\.body|sections|text\b/.test(route.split("items.push")[1] ?? ""), "the feed carries a title, link, date and dek, never the text of a work");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
