/**
 * Search (/cari): the folding, the matching and ranking, the filters, the series and novela handling, and the page's wiring.
 */
import fs from "node:fs";
import path from "node:path";
import { buildSearchIndex, filterDocs, filterOptions, fold, highlight, readable, runSearch, tokenize, QUERY_MAX, RESULT_LIMIT } from "../src/lib/reader/search";
import type { ContentRepository } from "../src/lib/content/repository";
import type { Work } from "../src/lib/content/types";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

function work(slug: string, type: string, extra: Record<string, unknown> = {}): Work {
  return {
    id: `id-${slug}`, slug, title: `Tajuk ${slug}`, type, status: "published", version: "v1", body: "", credits: [], visuals: [], glossary: [], editorialHistory: [],
    publishedAt: "2026-10-01", ...extra
  } as unknown as Work;
}

const works: Work[] = [
  work("anak-qasab", "cerpen", { title: "Anak Qasab", genre: "keluarga", dek: "Di paya Iraq selatan seorang gadis memilih qasab.", readingMinutes: 16, publishedAt: "2026-10-06", body: "Samira berdiri di tepi paya. Hujan turun di al-Ahwar sepanjang malam. Bau lumpur dan qasab basah.", metadata: { characters: [{ name: "Samira", role: "Gadis empat belas tahun" }], places: [{ name: "Nasiriyah" }], times: [{ name: "1986" }] }, glossary: [{ term: "mudif", meaning: "Bangunan reed." }] }),
  work("kerusi", "cerpen", { title: "Kerusi di Beranda", genre: "Keluarga", dek: "Seorang anak menulis.", readingMinutes: 12, publishedAt: "2026-09-21", body: "Kerusi rotan itu masih di beranda. Paya? Tidak, hanya longkang." }),
  work("riyadh", "sinopsis", { title: "Riyadh: November 90", genre: "sejarah", dek: "Sa'd al-Dusari menulis tentang Riyadh.", readingMinutes: 5, publishedAt: "2026-10-06", body: "Sinopsis ringkas." }),
  work("hamka", "fragmen", { title: "Keberangkatan ke Padang Panjang", genre: "Tragedi Romantik", readingMinutes: 40, publishedAt: "2026-10-02", body: "Zainuddin berangkat ke Padang Panjang." }),
  work("novela-x", "novela", { title: "Sekuntum Bunga", genre: "Fiksyen Sains", readingMinutes: 35, publishedAt: "2026-10-04", body: "" }),
  work("ep-1", "bersiri", { title: "Garing Bukan Hangit", genre: "Rumah tangga", readingMinutes: 35, publishedAt: "2026-10-05", body: "Hilmi menyiram pokok. Ada bunyi kerusi diseret." }),
  work("ep-2", "bersiri", { title: "Duit Dapur", genre: "Rumah tangga", readingMinutes: 30, publishedAt: "2026-10-06", body: "Wang belanja dapur setiap Isnin. Ahwar disebut sekali." })
];
const series = { id: "s1", slug: "siri-a", title: "Satu Daerah", dek: "Siri tentang Hilmi.", genre: "Rumah tangga", mode: "continuous", status: "ongoing" };
const repo = {
  source: "markdown",
  getWorks: () => works,
  getWork: (slug: string) => works.find((w) => w.slug === slug),
  getWorksByType: (t: string) => works.filter((w) => w.type === t),
  getContributor: () => undefined,
  getContributors: () => [],
  getReadingSections: (id: string) => (id === "id-novela-x" ? [{ slug: "bab-1", title: "Permulaan", body: "Alia menemui bunga pelik di makmal." }, { slug: "bab-2", title: "Kesan", body: "Ahwar tidak disebut di sini." }] : []),
  getPublishedSeries: () => [series],
  getSeriesBySlug: () => series,
  getPublishedSeriesEpisodes: () => [{ position: 1, slug: "ep-1", title: "Garing Bukan Hangit" }, { position: 2, slug: "ep-2", title: "Duit Dapur" }],
  getEpisodeBySeriesAndSlug: (_s: string, e: string) => works.find((w) => w.slug === e)
} as unknown as ContentRepository;
const docs = buildSearchIndex(repo);
const find = (q: string, extra: Record<string, string> = {}) => runSearch(docs, { q, ...extra });
const slugs = (q: string, extra: Record<string, string> = {}) => find(q, extra).results.map((r) => r.doc.slug);

// folding
assert(fold("Sa'd al-Ahwar") === "sa'd al ahwar" && fold("Sa\u2019d") === "sa'd" && fold("Kafé Ünïcödé").length === "Kafé Ünïcödé".length && fold("Kafé Ünïcödé") === "kafe unicode", "folding keeps the length, drops accents, and turns punctuation into spaces");
assert(JSON.stringify(tokenize("  Paya, PAYA al-Ahwar  ")) === '["paya","al","ahwar"]', "a query becomes its distinct words");
assert(tokenize("a ".repeat(40)).length === 1 && tokenize("w1 w2 w3 w4 w5 w6 w7 w8 w9 w10").length === 8 && tokenize("x".repeat(500)).join("").length <= QUERY_MAX, "a long query is cut: at most 8 words and 100 characters");

// the index: episodes are one series; a novela's chapters are searchable
assert(docs.filter((d) => d.type === "bersiri").length === 1 && docs.find((d) => d.type === "bersiri")!.href === "/kategori/bersiri/siri-a" && docs.find((d) => d.type === "bersiri")!.episodeCount === 2, "the two episodes are one result: the series");
assert(slugs("makmal").join() === "novela-x" && find("makmal").results[0]!.snippet?.label === "Bab 1: Permulaan", "a word inside a novela chapter finds the novela, and the snippet says which chapter");
assert(find("menyiram").results[0]!.doc.slug === "siri-a" && find("menyiram").results[0]!.snippet?.label.startsWith("Episod 1") === true, "a word inside an episode finds the series, and the snippet says which episode");

// matching
assert(slugs("paya").includes("anak-qasab") && slugs("paya").includes("kerusi"), "a word in the text finds the works that have it");
assert(slugs("PAYA")[0] === "anak-qasab" && slugs("Samira").join() === "anak-qasab" && slugs("nasiriyah").join() === "anak-qasab" && slugs("1986").join() === "anak-qasab", "case does not matter; characters, places and times are searched");
assert(slugs("mudif").join() === "anak-qasab", "glossary terms are searched");
assert(slugs("ahwar").sort().join() === ["anak-qasab", "novela-x", "siri-a"].join() && slugs("al ahwar").includes("anak-qasab") && slugs("al-Ahwar").includes("anak-qasab"), "al-Ahwar, al Ahwar and Ahwar agree");
assert(slugs("sad dusari").join() === "riyadh" && slugs("Sa'd").join() === "riyadh", "Sa'd finds Sa'd al-Dusari");
assert(slugs("pay").includes("anak-qasab") && !slugs("aya").includes("anak-qasab"), "a word start matches (pay finds paya) but a middle does not (aya does not)");
assert(slugs("paya longkang").join() === "kerusi" && slugs("paya hamka").length === 0, "every word must be found (a work with only one of the words is not a result)");
assert(find("zzzz").total === 0 && find("<script>alert(1)</script>").total === 0 && find("%00").total === 0, "a word that is nowhere, or markup, finds nothing and breaks nothing");

// something typed with nothing to search for finds nothing (it used to list every work); blank spaces are no query
assert(find("😀").total === 0 && find("\\([").total === 0 && find("\uFFFD").total === 0 && find("?!").total === 0, "a query of only an emoji or punctuation finds nothing");
assert(find("   ").total === docs.length && find("").total === docs.length, "a blank query lists every work");

// ranking
assert(slugs("Padang Panjang")[0] === "hamka", "a title match is first");
assert(slugs("qasab")[0] === "anak-qasab", "a title (and text) match comes before a text-only match");
assert(slugs("paya")[0] === "anak-qasab" && slugs("paya")[1] === "kerusi", "more of the word, and in the dek, ranks higher");
assert(slugs("paya", { susun: "terbaru" }).join() === "anak-qasab,kerusi", "newest first when asked");

// filters
assert(slugs("", { jenis: "sinopsis" }).join() === "riyadh", "type filter");
assert(slugs("", { genre: "keluarga" }).sort().join() === "anak-qasab,kerusi", "genre filter ignores case (keluarga and Keluarga are one)");
assert(slugs("", { penulis: "Orang Tiada" }).length === 0, "an author filter with no matching credit leaves nothing");
assert(slugs("", { bacaan: "pendek" }).sort().join() === "kerusi,riyadh" && slugs("", { bacaan: "sederhana" }).join() === "anak-qasab" && slugs("", { bacaan: "panjang" }).sort().join() === "hamka,novela-x", "reading-time bands (a series has no single reading time, so it is in none)");
assert(slugs("paya", { jenis: "cerpen", bacaan: "pendek" }).join() === "kerusi", "filters combine with the words");
assert(slugs("", { jenis: "tiada" }).length === 0 && slugs("", { bacaan: "tiada" }).length === docs.length, "an unknown type finds nothing; an unknown reading band is ignored");
assert(runSearch(docs, {}).results.length === docs.length && runSearch(docs, {}).results[0]!.doc.publishedAt >= runSearch(docs, {}).results.at(-1)!.doc.publishedAt, "no words: every work, newest first");
const options = filterOptions(docs);
assert(options.types.join() === "cerpen,novela,bersiri,fragmen,sinopsis" && options.genres.filter((g) => g.toLowerCase() === "keluarga").length === 1 && options.genres.includes("Tragedi Romantik"), "the filter lists come from the works there are, a genre written two ways once");

// snippets
const snippet = find("lumpur").results[0]!.snippet!;
assert(snippet.parts.some((p) => p.hit && p.text.toLowerCase() === "lumpur") && snippet.parts.map((p) => p.text).join("").includes("Bau lumpur"), "a snippet shows the original words with the matches marked");
const parts = highlight("Hujan di al-Ahwar", fold("Hujan di al-Ahwar"), ["ahwar"]);
assert(parts.filter((p) => p.hit).map((p) => p.text).join() === "Ahwar" && parts.map((p) => p.text).join("") === "Hujan di al-Ahwar", "marking keeps the text whole");
assert(highlight("Paya", "paya", ["pay"]).filter((p) => p.hit)[0]!.text === "Paya", "a word start marks the whole word");

// the snippet is what a reader would read: no Markdown marks
assert(readable("# Kerusi di Beranda\n\nPak *Long* **berkata**[^1] sesuatu.\n\n[^1]: Nota satu.") === "Kerusi di Beranda Pak Long berkata sesuatu. Nota satu.", "headings, emphasis and note marks are taken off the text a snippet is cut from");
assert(!find("Kerusi").results.map((r) => r.snippet?.parts.map((p) => p.text).join("") ?? "").some((t) => t.includes("#")), "no snippet shows a Markdown heading mark");

// limits
const many = Array.from({ length: RESULT_LIMIT + 20 }, (_, i) => ({ ...docs[0]!, slug: `x${i}` }));
assert(runSearch(many, {}).results.length === RESULT_LIMIT && runSearch(many, {}).total === RESULT_LIMIT + 20, "at most 50 results are shown; the count says how many there are");
assert(filterDocs(docs, { q: "paya", jenis: "<b>" }).length === 0, "a hostile filter value just finds nothing");

// the page and the menu
const page = read("src/app/cari/page.tsx");
assert(page.includes('role="search"') && page.includes('action="/cari"') && page.includes('method="get"') && page.includes('htmlFor="cari-q"'), "the page is a plain GET form with a labelled search box (no script needed)");
assert(page.includes("robots: { index: false, follow: true }") && !page.includes("dangerouslySetInnerHTML") && page.includes('role="status"'), "the page is not indexed, shows words as text (not HTML), and says the count to screen readers");
assert(read("src/components/reader/nav-links.tsx").includes('href: "/cari"'), "the menu has Cari (desktop and phone)");
assert(!read("src/app/sitemap.ts").includes("/cari"), "the search page is not in the sitemap");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
