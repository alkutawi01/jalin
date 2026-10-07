/**
 * Izzat: "mcm mana nak crop dan fokus gambar hero bersiri? … gambar tu sama je mcm gambar2 lain, patutnya boleh crop."
 * A work's picture has had a focus and a zoom since migration 022; a series' picture had none and was always centred. It now has
 * the same (migration 024), chosen on the series' edit page with the same picker, and used wherever the picture is shown. The part
 * chosen for an episode's own picture was also dropped on the episode page and in the home page's "Bersiri" block.
 */
import fs from "node:fs";
import path from "node:path";
import { episodeHeroOf } from "../src/lib/reader/chapter-visuals";
import { cropFromRow, cropStyle } from "../src/lib/reader/crop";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const crop = { x: 20, y: 80, zoom: 150 };
const own = episodeHeroOf({ src: "episod.png", alt: "Episod", crop }, { src: "siri.png", alt: "Siri" });
assert(own?.src === "episod.png" && JSON.stringify(own.crop) === JSON.stringify(crop), "an episode's own picture keeps the part chosen for it", own);
const shared = episodeHeroOf(undefined, { src: "siri.png", alt: "Siri", crop });
assert(shared?.src === "siri.png" && JSON.stringify(shared.crop) === JSON.stringify(crop), "an episode with no picture shows the series' picture with the series' crop", shared);
assert(episodeHeroOf({ src: "a.png" }, undefined)?.crop === undefined && episodeHeroOf(undefined, undefined) === undefined, "no crop chosen: none invented");
assert(cropFromRow({ focus_x: null, focus_y: undefined, zoom: null }) === undefined && cropStyle(cropFromRow({ focus_x: 20, focus_y: 80, zoom: 150 }))?.objectPosition === "20% 80%", "a series row without the columns (before migration 024) gives no crop; with them, the same style as a work's picture");

const repository = read("src/lib/content/database-repository.ts");
assert(repository.includes("cropFromRow({ focus_x: row.hero_focus_x, focus_y: row.hero_focus_y, zoom: row.hero_zoom })") && repository.includes("...(seriesCrop(se) ? { crop: seriesCrop(se)! } : {})"), "the series' crop reaches readers");
const shown: Array<[string, string]> = [
  ["src/app/kategori/bersiri/[seriesSlug]/page.tsx", "style={cropStyle(series.hero.crop)}"],
  ["src/app/kategori/[type]/page.tsx", "style={cropStyle(series.hero.crop)}"],
  ["src/app/page.tsx", "style={cropStyle(data.hero.crop)}"],
  ["src/components/reader/EpisodeView.tsx", "rights, crop: hero.crop }"],
  ["src/lib/reader/editor-picks.ts", "...(series.hero.crop ? { crop: series.hero.crop } : {})"],
  ["src/lib/reader/public-projection.ts", "...(series.hero.crop ? { crop: series.hero.crop } : {})"],
  ["src/lib/reader/search.ts", "...(series.hero.crop ? { crop: series.hero.crop } : {})"],
];
for (const [file, text] of shown) assert(read(file).includes(text), `${file.replace("src/", "")} uses the crop`);

const service = read("src/lib/admin/series-hero.ts");
assert(service.includes("export async function setSeriesHeroCrop") && service.includes("const centred = x === 50 && y === 50 && zoom === 100;") && service.includes("hero_focus_x: centred ? null : x"), "the centre at no zoom is stored as nothing chosen");
assert(service.includes("menjalankan migrasi 024 dahulu") && /hero_\(src\|alt\|focus_x\|focus_y\|zoom\)/.test(service), "before migration 024 the editor is told so, not shown a database error");
assert(service.includes("hero_focus_x: null, hero_focus_y: null, hero_zoom: null } as never).execute().catch(() => {})"), "a new picture starts centred, and uploading still works before the migration");
const route = read("src/app/api/admin/series/[id]/hero/route.ts");
assert(/export async function PATCH[\s\S]*?getCurrentAdmin\(\)\)\) return NextResponse\.json\(\{ error: SESSION_ENDED \}, \{ status: 401 \}\)[\s\S]*?setSeriesHeroCrop\(id, body\)/.test(route), "saving the crop needs a login");
const page = read("src/app/admin/series/[id]/page.tsx");
assert(page.includes("<ImageFocusPicker") && page.includes("Simpan bahagian gambar") && page.includes('method: "PATCH"'), "the series' edit page has the same picker a work's picture has");
const migration = read("src/lib/db/migrations/024_series_hero_crop.ts");
assert(migration.includes('["hero_focus_x", "hero_focus_y", "hero_zoom"]') && migration.includes('addColumn(name, "integer")') && migration.includes("information_schema.columns"), "migration 024 only adds three nullable columns, and can be run twice");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
