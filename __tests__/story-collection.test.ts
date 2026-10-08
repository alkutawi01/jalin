/**
 * Homepage "Koleksi cerita" (8 Okt): a random set of stories, series episodes included, with a button for another set.
 * A series episode card reads: eyebrow / "Episod N: judul" / "Daripada <siri>" / dek.
 */
import fs from "node:fs";
import path from "node:path";
import { COLLECTION_SIZE, episodeTitle, pickCollection, shuffled, type StoryCard } from "../src/lib/reader/story-collection";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const card = (n: number): StoryCard => ({ key: `/kategori/cerpen/c${n}`, href: `/kategori/cerpen/c${n}`, type: "cerpen", eyebrow: "Cerpen", title: `C${n}`, year: "2026" });
const pool = Array.from({ length: 20 }, (_, i) => card(i));
let seed = 7;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// Picking
const first = pickCollection(pool, new Set(), COLLECTION_SIZE, random);
assert(first.length === COLLECTION_SIZE && new Set(first.map((c) => c.key)).size === COLLECTION_SIZE, "a set has six different cards");
const shown = new Set(first.map((c) => c.key));
let overlap = false;
for (let i = 0; i < 50; i++) if (pickCollection(pool, shown, COLLECTION_SIZE, random).some((c) => shown.has(c.key))) overlap = true;
assert(!overlap, "another set never repeats a card that is on screen while the pool has enough others");
const small = pool.slice(0, 8);
const smallShown = new Set(small.slice(0, 6).map((c) => c.key));
const refill = pickCollection(small, smallShown, COLLECTION_SIZE, random);
assert(refill.length === COLLECTION_SIZE && new Set(refill.map((c) => c.key)).size === COLLECTION_SIZE && small.slice(6).every((c) => refill.some((r) => r.key === c.key)), "with too few other cards, all of them are used and the rest is filled from the ones on screen");
assert(pickCollection(pool.slice(0, 3), new Set(), COLLECTION_SIZE, random).length === 3, "a small pool gives what there is, without repeats");
assert(pickCollection([], new Set(), COLLECTION_SIZE, random).length === 0, "an empty pool gives an empty set");
const order = shuffled(pool, random);
assert(order.length === pool.length && new Set(order.map((c) => c.key)).size === pool.length && order.some((c, i) => c !== pool[i]), "shuffling keeps every card and changes the order");
assert(pool[0]!.key === "/kategori/cerpen/c0", "the pool itself is not reordered");

// Episode card text
assert(episodeTitle(2, "Duit Dapur Setiap Isnin") === "Episod 2: Duit Dapur Setiap Isnin", "an episode title is 'Episod N: judul'");

// Wiring
const page = read("src/app/page.tsx");
const view = read("src/components/reader/StoryCollection.tsx");
const lib = read("src/lib/reader/story-collection.ts");
const api = read("src/app/api/koleksi-cerita/route.ts");
assert(!page.includes("Karya terbaru") && view.includes("Koleksi cerita"), "the section is called 'Koleksi cerita' and nothing on the page still says 'Karya terbaru'");
assert(read("src/lib/site-theme.ts").includes('label: "Koleksi cerita"') && !read("src/lib/site-theme.ts").includes("Karya terbaru"), "Tetapan > Warna blok calls the block 'Koleksi cerita' too");
assert(page.includes("pickCollection(await buildStoryPool())") && !/slice\(0,\s*6\)/.test(page), "the homepage no longer takes the six newest");
assert(lib.includes('work.type === "bersiri"') && lib.includes("/kategori/bersiri/${info.series.slug}/${work.slug}"), "series episodes are in the pool and link to their address under the series");
assert(view.includes("Daripada {card.seriesTitle}") && !/Daripada[^\n]*<a /.test(view), "'Daripada <siri>' is plain text, not a link");
const iEyebrow = view.indexOf("card.eyebrow"), iTitle = view.indexOf("latest-card-title"), iSeries = view.indexOf("latest-card-series"), iDek = view.indexOf("latest-card-dek");
assert(iEyebrow < iTitle && iTitle < iSeries && iSeries < iDek, "order on a card: eyebrow, title, 'Daripada', dek");
assert(view.includes("Cerita lain") && view.includes('type="button"') && view.includes("aria-live"), "a real button, announced to screen readers");
assert(view.includes("Cerita lain tidak dapat dimuatkan.") && view.includes("disabled={loading}"), "a failed load says so and a double click is ignored");
assert(api.includes("force-dynamic") && api.includes("no-store") && !api.includes("admin"), "the API is public, read-only and never cached");
assert(!/\/api\/koleksi-cerita/.test(read("src/middleware.ts")), "the middleware leaves the public API alone");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
