/**
 * Meta descriptions (found by auditing all 32 sitemap pages on production): chapter, series and episode pages used the whole dek,
 * up to 323 characters, and search results show about 160. They are now shortened at a word boundary with an ellipsis.
 * (The site-level pages have no og:image at all; that needs a design decision and is not part of this change.)
 */
import fs from "node:fs";
import path from "node:path";
import { clipDescription, META_DESCRIPTION_MAX } from "../src/lib/seo";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail === undefined ? "" : JSON.stringify(detail)); }
}

assert(clipDescription("Pendek sahaja.") === "Pendek sahaja.", "a short description is unchanged");
assert(clipDescription("  Banyak   ruang\n\nputih  ") === "Banyak ruang putih", "whitespace is collapsed and trimmed");
const exact = "a".repeat(META_DESCRIPTION_MAX);
assert(clipDescription(exact) === exact, "exactly the limit is unchanged");

const long = "Seorang penyelidik kecerdasan buatan menemui satu modul tersembunyi di dalam sistem ciptaannya sendiri, dan sekuntum bunga digital yang tidak pernah diminta sesiapa, lalu tertanya-tanya siapa sebenarnya yang meninggalkan sebahagian roh di dalam mesin itu.";
const clipped = clipDescription(long);
assert(clipped.length <= META_DESCRIPTION_MAX, `a long one is at most ${META_DESCRIPTION_MAX} characters`, clipped.length);
assert(clipped.endsWith("…") && !clipped.endsWith(" …"), "it ends with an ellipsis, no space before it", clipped.slice(-12));
assert(long.startsWith(clipped.slice(0, -1)), "it is a prefix of the original (nothing rewritten)");
const lastWord = clipped.slice(0, -1).split(" ").pop() ?? "";
assert(long.split(/[\s,]+/).includes(lastWord), "the last word is a whole word of the original", lastWord);
assert(clipDescription("x".repeat(400)).length <= META_DESCRIPTION_MAX, "a single unbroken word is still cut to the limit");
assert(clipDescription("Dek panjang, " + "kata ".repeat(60)).length <= META_DESCRIPTION_MAX && !/[,;:—–-]…$/.test(clipDescription("Dek panjang, " + "kata ".repeat(60))), "no dangling punctuation before the ellipsis");

const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
assert(read("src/app/kategori/[type]/[slug]/page.tsx").includes("const pageDescription = clipDescription("), "work and chapter pages clip their description");
assert(read("src/app/kategori/bersiri/[seriesSlug]/page.tsx").includes("const description = clipDescription("), "the series page clips its description");
assert(read("src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx").includes("const description = clipDescription("), "an episode page clips its description");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
