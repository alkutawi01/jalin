/**
 * Izzat (5 Okt, telefon): hero homepage, gambar bersiri di homepage dan hero setiap karya penuh dari sempadan ke sempadan skrin;
 * teks karya dikecilkan sedikit; kotak tajuk dan notis hak cipta pada gambar bersiri melekat pada tepi gambar; halaman penyumbang
 * boleh disunting editor; Tetapan lebih tersusun. Checked in a browser (375px and desktop) on a temporary Neon branch.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const css = read("src/app/globals.css");

const hero = css.slice(css.indexOf("/* A hero is edge to edge on the screen whenever it stands alone"));
// For each hero kind: inside the media query where its layout stacks, it is 100vw wide, has no side margin and square corners.
for (const [sel, w] of [[".hero-featured-visual", 1050], [".work-head-visual", 900], [".series-hero", 900], [".series-feature-media", 700], [".hero-figure", 700]] as const) {
  const start = hero.indexOf(`@media (max-width: ${w}px) {`, hero.indexOf(sel) > 0 ? 0 : 0);
  let ok = false;
  for (let at = hero.indexOf(`@media (max-width: ${w}px) {`); at >= 0 && !ok; at = hero.indexOf(`@media (max-width: ${w}px) {`, at + 1)) {
    const body = hero.slice(at, hero.indexOf("\n}\n", at));
    ok = body.includes(sel) && body.includes("width: 100vw") && body.includes("margin-left: calc(50% - 50vw)") && body.includes("border-radius: 0");
  }
  assert(ok && start >= 0, `${sel} runs edge to edge once its layout stacks (max-width ${w}px)`);
}
assert(/\.story-body \{\s*font-size: 17px;\s*line-height: 1\.72;/.test(css) && !/\.story-body \{ font-size: 19px;/.test(css), "the work text uses the compact phone reading scale (17px/1.72, was 19px)");
assert(/\.series-feature-overlay \{[^}]*bottom: 32px; left: 0;/.test(css) && /\.series-feature-overlay \{[^}]*padding: 10px 14px 11px 26px; border-radius: 0 6px 6px 0/.test(css), "the series title box floats above the bottom edge and sits against the picture's left edge, while the title text is set in from it (Izzat, 6 Okt)");
assert(/\.series-feature-media > \.image-rights \{ right: 0; bottom: 14px;/.test(css), "the copyright notice sits against the picture's right edge, 14px above the bottom");
assert(css.includes("body { overflow-x: hidden; overflow-x: clip; container-type: inline-size; }") && (css.match(/width: 100cqw; max-width: 100cqw; margin-left: calc\(50% - 50cqw\);/g) ?? []).length === 3, "full-width pictures use the width the page really has (100cqw, scrollbar excluded), so the copyright notice at the right edge is not cut in a window with a scrollbar");

const contributor = read("src/app/penulis/[slug]/page.tsx");
assert(contributor.includes('{ "nara-zahin": "claude" }') && contributor.includes('.where("slug", "in", [slug, EDITOR_RECORD[slug] ?? slug])'), "the older address 'nara-zahin' shows what the editor writes for that person in Admin > Penyumbang");
assert(contributor.includes('.replace(/\\r\\n/g, "\\n").trim().replace(/^# .+\\n+/'), "a bio saved from the admin text box does not show its name twice");

const settings = read("src/app/admin/settings/page.tsx");
for (const id of ["teks-awam", "nama-samaran", "arahan-ai", "alat-lain", "status-sistem"]) {
  assert(settings.includes(`id="${id}"`) && settings.includes(`href="#${id}"`), `Tetapan has the section #${id} and an index link to it`);
}
assert((settings.match(/<details className="a-settings-fold"/g) ?? []).length === 2 && settings.indexOf("teks-awam") < settings.indexOf("arahan-ai"), "the long AI instructions are folded and come after the texts editors change most");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
