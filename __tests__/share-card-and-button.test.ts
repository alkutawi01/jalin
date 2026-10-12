/** A shared link ends on a whole sentence, its picture is 1.91:1, and a work has a "Kongsi" button. */
import fs from "node:fs";
import path from "node:path";
import { clipDescription, ogImageUrl, shareImage, shareImageUrl } from "../src/lib/seo";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const dek = "Di sebuah kampung berhampiran Tebedu, sebatang papan hanyut mempertemukan tukang kayu dengan seorang pengajar. Mampukah hubungan tumbuh ketika khabar dari sempadan semakin meresahkan? Kayu itu masih menunggu.";
const clipped = clipDescription(dek);
assert(clipped.length <= 160, "a clipped description is at most 160 characters");
assert(clipped === "Di sebuah kampung berhampiran Tebedu, sebatang papan hanyut mempertemukan tukang kayu dengan seorang pengajar." && !clipped.includes("…"), "it stops on the last whole sentence that fits, with no ellipsis");
assert(clipDescription("Pendek. " + "kata ".repeat(60)).endsWith("…"), "a lone short first sentence does not win over the word-boundary cut");
assert(clipDescription("Satu ayat yang amat panjang tanpa sebarang noktah di dalamnya sehingga ia terpaksa dipotong pada sempadan perkataan kerana tiada tempat berhenti yang lebih baik di sini sama sekali dan seterusnya selamanya").endsWith("…"), "with no sentence end in reach it still cuts at a word with an ellipsis");

const img = shareImage("https://abc.public.blob.vercel-storage.com/a.png", "Alt");
assert(img.url.includes("/api/og?src=") && img.width === 1200 && img.height === 630 && img.alt === "Alt", "the card picture is the 1200 x 630 crop, with its description");
assert(shareImageUrl("https://abc.public.blob.vercel-storage.com/a.png").includes("/_next/image?"), "structured data keeps the uncropped picture");
assert(ogImageUrl("/visuals/a.png").endsWith("src=%2Fvisuals%2Fa.png"), "the source is encoded");

const route = read("src/app/api/og/route.tsx");
assert(route.includes("ImageResponse") && route.includes("objectFit: \"cover\"") && route.includes("1200") && route.includes("630"), "the route crops to cover 1200 x 630");
assert(route.includes("vercel-storage") && route.includes("BLOB_HOST.test(") && route.includes("DEFAULT_SHARE_IMAGE.url"), "only this site's pictures are accepted, anything else gets the default card");

const row = read("src/components/reader/ShareRow.tsx");
assert(row.includes("wa.me") && row.includes("facebook.com/sharer") && row.includes("twitter.com/intent") && row.includes("navigator.clipboard.writeText"), "the row has WhatsApp, Facebook, X and copy link");
assert(row.includes("window.location.pathname") && !row.includes("location.search"), "it shares the page address without a query string");
const work = read("src/app/kategori/[type]/[slug]/page.tsx");
const episode = read("src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx");
assert(!work.includes("ShareWorkButton") && !episode.includes("ShareWorkButton"), "no share button floats over the page any more");
const workView = read("src/components/reader/WorkView.tsx").replace(/\s+/g, " ");
const episodeView = read("src/components/reader/EpisodeView.tsx").replace(/\s+/g, " ");
assert(/<StoryEnd [^>]*\/> <ShareRow title=\{work.title\} \/>/.test(workView) && /<StoryEnd [^>]*\/> <ShareRow title=\{work.title\} \/>/.test(episodeView), "Kongsi comes straight after Tamat, on a work and on an episode");
assert(read("src/app/globals.css").includes("body:has(.save-work) .back-to-top"), "the back-to-top button clears Simpan");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
