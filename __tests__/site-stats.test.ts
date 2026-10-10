/**
 * Home page statistics line (under the hero carousel): one figure per category in menu order, a series counted once,
 * a category with nothing published left out, each figure linking to its category page.
 */
import fs from "node:fs";
import path from "node:path";
import { computeSiteStats, statItems } from "../src/lib/reader/site-stats";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${msg}`, detail ?? "");
  }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const works = [
  { type: "cerpen" }, { type: "cerpen" }, { type: "cerpen" },
  { type: "novela" },
  { type: "bersiri" }, { type: "bersiri" }, { type: "bersiri" },
  { type: "sinopsis" }, { type: "sinopsis" }
] as never[];
const stats = computeSiteStats(works, 2);
assert(stats.cerpen === 3 && stats.novela === 1 && stats.sinopsis === 2 && stats.fragmen === 0, "standalone entries are counted by their category", stats);
assert(stats.bersiri === 2, "a series counts once (the published series), not once per episode", stats);

const items = statItems(stats);
assert(items.map((i) => i.key).join() === "cerpen,novela,bersiri,sinopsis", "figures follow the menu order and a category with nothing published is left out", items);
assert(items[0].count === 3 && items[0].value === "3" && items[0].label === "cerpen" && items[0].href === "/kategori/cerpen", "each figure carries its label and links to its category page", items[0]);
assert(statItems({ cerpen: 0, novela: 0, bersiri: 0, fragmen: 0, sinopsis: 0 }).length === 0, "nothing published shows no figures");
assert(!JSON.stringify(items).includes("diterbit") && !JSON.stringify(items).includes("glosari") && !JSON.stringify(items).includes("ilustrasi"), "only category names are shown");

const page = read("src/app/page.tsx");
const band = read("src/components/reader/HomeStats.tsx");
assert(page.includes("<HomeStats stats={stats} ground={grounds.stats}") && band.includes("home-stats") && band.includes("data-ground={ground}") && band.includes("href={item.href}"), "the home page renders the line with its chosen background and links");
assert(band.includes("<CountUp value={item.count}"), "the figures count up from zero");
assert(read("src/components/reader/CountUp.tsx").includes("prefers-reduced-motion"), "the count-up is skipped for anyone who prefers reduced motion");
const css = read("src/app/globals.css");
assert(css.includes(".home-stat-value") && css.includes(".home-stat a:focus-visible"), "the line has its styles, with a visible keyboard focus");

console.log(`site-stats: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
