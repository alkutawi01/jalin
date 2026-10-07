/**
 * A page that sets its own openGraph replaces the layout's whole block, so works, lists, series, episodes and author pages had no
 * og:site_name and no og:locale: a shared link did not say it was from Jalin. Every page now spreads the site's base in.
 * The share picture also carries its description, and a work its publication dates.
 */
import fs from "node:fs";
import path from "node:path";
import { OG_SITE, shareImage, shareImageUrl } from "../src/lib/seo";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(OG_SITE.siteName === "Jalin — oleh Adjung" && OG_SITE.locale === "ms_MY", "the site's name and locale for a share card");
assert(read("src/app/layout.tsx").includes('siteName: "Jalin — oleh Adjung"') && read("src/app/layout.tsx").includes('locale: "ms_MY"'), "the same as the layout says");

const PAGES = [
  "src/app/kategori/[type]/page.tsx",
  "src/app/kategori/[type]/[slug]/page.tsx",
  "src/app/kategori/bersiri/[seriesSlug]/page.tsx",
  "src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx",
  "src/app/penulis/[slug]/page.tsx"
];
for (const page of PAGES) {
  const src = read(page);
  const blocks = src.match(/openGraph: \{/g) ?? [];
  const withSite = src.match(/openGraph: \{\s*\.\.\.OG_SITE,/g) ?? [];
  assert(blocks.length > 0 && blocks.length === withSite.length && /import \{[^}]*\bOG_SITE\b[^}]*\} from "[./]+\/lib\/seo";/.test(src), `${page}: its share card names the site and the language`);
}
// every other page that sets openGraph says the site name itself (the three information pages), so none is left without it
const appDir = path.join(__dirname, "..", "src", "app");
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []));
const missing = walk(appDir).filter((file) => !file.includes(`${path.sep}admin${path.sep}`)).filter((file) => {
  const src = fs.readFileSync(file, "utf8");
  return /openGraph: \{/.test(src) && !/OG_SITE|siteName:/.test(src);
});
assert(missing.length === 0, `no public page sets a share card without the site's name${missing.length ? ": " + missing.map((f) => path.relative(appDir, f)).join(", ") : ""}`);

const withAlt = shareImage("/visuals/a/hero.png", "  Kerusi rotan di beranda ");
assert(withAlt.url === shareImageUrl("/visuals/a/hero.png") && withAlt.alt === "Kerusi rotan di beranda", "the share picture carries its description");
assert(!("alt" in shareImage("/visuals/a/hero.png", "")) && !("alt" in shareImage("/visuals/a/hero.png", null)) && !("alt" in shareImage("/visuals/a/hero.png")), "a picture without a description has no empty alt");
assert(read("src/app/kategori/[type]/[slug]/page.tsx").includes("publishedTime: work.publishedAt") && read("src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx").includes("publishedTime: work.publishedAt"), "a work and an episode say when they were published");
assert(read("src/app/penulis/[slug]/page.tsx").includes('type: "profile"'), "an author page is a profile");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
