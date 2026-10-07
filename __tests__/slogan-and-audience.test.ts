/**
 * The site's own words (Izzat, 7 Oct 2026): the slogan is "Selami dunia melalui cerita", and public copy does not narrow the
 * readers to an age ("remaja", "jiwa muda"). The homepage title and description say what Jalin publishes, for a search result
 * and a shared link.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const layout = read("src/app/layout.tsx");
const title = (layout.match(/default: "([^"]+)"/) ?? [])[1] ?? "";
const description = (layout.match(/\n  description: "([^"]+)"/) ?? [])[1] ?? "";
assert(title === "Jalin: Cerpen, novela dan cerita bersiri berilustrasi" && title.length <= 60, "the homepage title says what Jalin publishes, in 60 characters or fewer");
assert(description.startsWith("Selami dunia melalui cerita di Jalin") && description.length >= 120 && description.length <= 160, "the description carries the slogan and fits a search result (120 to 160 characters)");
assert(layout.includes('template: "%s · Jalin"') && layout.includes('description: "Selami dunia melalui cerita berilustrasi dalam Bahasa Melayu."'), "other pages keep their own title before '· Jalin'; the share card has the short line");

assert(read("src/components/reader/StoryChrome.tsx").includes('<p className="footer-tagline">Selami dunia melalui cerita</p>'), "the footer carries the slogan, without a full stop");
const about = read("src/app/tentang/page.tsx");
assert(about.includes('title="Selami dunia melalui cerita"') && about.includes("mengajak pembaca menyelami dunia melalui cerpen, novela, cerita bersiri, fragmen dan sinopsis."), "the About page opens with the slogan and says what there is to read");

// no public page narrows the readers to an age
const dirs = ["src/app", "src/components/reader"];
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []));
const root = path.join(__dirname, "..");
const hits = dirs.flatMap((d) => walk(path.join(root, d))).filter((file) => !file.includes(`${path.sep}admin${path.sep}`)).filter((file) => {
  const text = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  return /jiwa muda|Cerita untuk kita|untuk (pembaca )?remaja/i.test(text);
});
assert(hits.length === 0, `no public page says "jiwa muda", "untuk remaja" or the old slogan${hits.length ? ": " + hits.map((f) => path.relative(root, f)).join(", ") : ""}`);

assert(read("src/lib/seo.ts").includes(`export const SITE_DESCRIPTION = "${description}";`) && read("src/app/page.tsx").includes("siteJsonLd(SITE_DESCRIPTION)"), "the homepage's structured data says the same sentence as its description");

// The share picture of pages with no picture of their own: a 1200 x 630 PNG, light enough for every chat app's preview.
const png = fs.readFileSync(path.join(root, "public/brand/og-default.png"));
assert(png.subarray(1, 4).toString("ascii") === "PNG" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630 && png.length < 300 * 1024, "the default share picture is a 1200 x 630 PNG under 300 KB");
const seo = read("src/lib/seo.ts");
assert(seo.includes("/brand/og-default.png") && seo.includes("width: 1200, height: 630") && seo.includes('alt: "Jalin — Selami dunia melalui cerita"'), "it is declared with its size and a description");
assert(layout.includes("images: [DEFAULT_SHARE_IMAGE]") && layout.includes("images: [DEFAULT_SHARE_IMAGE.url]"), "the homepage (and every page that sets no card of its own) shares it");
for (const page of ["src/app/kategori/[type]/page.tsx", "src/app/penulis/[slug]/page.tsx", "src/app/tentang/page.tsx", "src/app/privasi/page.tsx", "src/app/terma/page.tsx"]) {
  assert(read(page).includes("images: [DEFAULT_SHARE_IMAGE]") && read(page).includes("images: [DEFAULT_SHARE_IMAGE.url]"), `${page} shares it on Open Graph and on X`);
}
for (const page of ["src/app/kategori/[type]/[slug]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx"]) {
  assert(/\? shareImage\([^)]*\) : DEFAULT_SHARE_IMAGE\]/.test(read(page)) && !read(page).includes('"summary"'), `${page}: its own picture first, the default when it has none`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
