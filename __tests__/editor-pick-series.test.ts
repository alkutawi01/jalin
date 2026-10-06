/**
 * A series episode picked as an Editor's pick was saved (the admin showed 3 of 3) but dropped from the home carousel (2 slides),
 * because the home page left every "bersiri" work out. An episode pick is now shown as its series, and two episodes of one series
 * cannot both be picked.
 */
import fs from "node:fs";
import path from "node:path";
import { resolveHeroPicks, seriesPickedTwice } from "../src/lib/reader/editor-picks";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const work = (slug: string, type: string, extra: Record<string, unknown> = {}) => ({ slug, type, title: `T ${slug}`, genre: "g", dek: `dek ${slug}`, publishedAt: "2026-10-01", hero: { src: `/${slug}.png`, alt: slug }, attribution: { primary: "Penulis" }, readingMinutes: 5, ...extra }) as never;
const series = { slug: "siri-a", title: "Siri A", dek: "Dek siri", genre: "Rumah Tangga", hero: { src: "/siri-a.png", alt: "Ilustrasi siri" } };
const lookup = (slug: string) => (slug === "ep-1" || slug === "ep-2" ? series : undefined);

const slides = resolveHeroPicks([work("ep-1", "bersiri"), work("frag", "fragmen"), work("nov", "novela")], lookup);
assert(slides.length === 3, "an episode pick, a fragmen and a novela are three slides (the case that showed two)");
assert(slides[0]!.slug === "siri-a" && slides[0]!.type === "bersiri" && slides[0]!.title === "Siri A" && slides[0]!.dek === "Dek siri" && slides[0]!.hero?.src === "/siri-a.png", "the episode pick is the series: its title, dek and artwork, linking to the series page (/kategori/bersiri/siri-a)");
assert(slides[1]!.slug === "frag" && slides[2]!.slug === "nov", "the order of the picks is kept");
const twice = resolveHeroPicks([work("ep-1", "bersiri"), work("ep-2", "bersiri")], lookup);
assert(twice.length === 1 && twice[0]!.slug === "siri-a", "two episodes of one series are one slide");
const noArt = resolveHeroPicks([work("ep-1", "bersiri")], () => ({ slug: "siri-a", title: "Siri A" }));
assert(noArt[0]!.hero?.src === "/ep-1.png" && noArt[0]!.dek === "dek ep-1" && noArt[0]!.genre === "g", "a series without artwork or dek falls back to the episode's picture, dek and genre");
assert(resolveHeroPicks([work("lost", "bersiri")], lookup).length === 0, "an episode of no published series cannot be linked to, so it is left out");

// the admin refuses two episodes of one series, so its count matches the carousel
const entries = [{ seriesId: "s1", workId: "w1" }, { seriesId: "s1", workId: "w2" }, { seriesId: "s2", workId: "w3" }, { seriesId: "s1", workId: "w9" }];
assert(JSON.stringify(seriesPickedTwice(entries, ["w1", "w2", "w3"])) === '["s1"]', "two picked episodes of one series are caught");
assert(seriesPickedTwice(entries, ["w1", "w3"]).length === 0, "one episode from each of two series is fine");

// wired in
const page = read("src/app/page.tsx");
assert(page.includes("getEditorPickSummaries(allWorks)") && page.includes("resolveHeroPicks(pickSummaries"), "the home page reads the picks from every published work and resolves episodes to series");
assert(read("src/lib/admin/editor-picks-service.ts").includes("seriesPickedTwice("), "saving the picks refuses two episodes of one series");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
