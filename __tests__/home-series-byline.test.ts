/**
 * Izzat (8 Okt): the Bersiri block on the homepage never showed who wrote the series, while every other card does. It now carries one
 * "Oleh ..." line with the same names as the series page.
 */
import fs from "node:fs";
import path from "node:path";
import { seriesAuthorNames } from "../src/lib/reader/series-authors";
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const c = (slug: string, name: string, byline: boolean, role = "initial_draft") => ({ slug, role, byline, displayName: name, kind: "virtual" as const });

const ep1 = [c("izzat-anas", "Izzat Anas", false, "Pengarah"), c("chatgpt", "Rafiq Naim", true), c("claude", "Nara Zahin", true)];
const ep2 = [c("chatgpt", "Rafiq Naim", true), c("mimo", "Mimo", true)];
assert(seriesAuthorNames([ep1, ep2]).join() === "Rafiq Naim,Nara Zahin,Mimo", "names under the title across episodes, in reading order, each once; a credit without a name under the title is left out");
assert(seriesAuthorNames([]).length === 0 && seriesAuthorNames([undefined, []]).length === 0, "no credits, no line");
assert(seriesAuthorNames([[c("izzat-anas", "Izzat Anas", false)]]).length === 0, "a series with nobody under the title shows no name");

const home = read("src/app/page.tsx");
assert(home.includes("authors: string[]") && home.includes("seriesAuthorNames(ordered.map((e) => repo.getWork(e.slug)?.credits))"), "the highlight collects the authors of every published episode");
assert(home.includes("data.authors.length > 0 ?") && home.includes("Oleh ${data.authors.join(\", \")}"), "the Bersiri block prints 'Oleh ...' when there are names");
const page = read("src/app/kategori/bersiri/[seriesSlug]/page.tsx");
assert(read("src/app/globals.css").includes(".series-feature-byline"), "the line has its own quiet style");
assert(page.length > 0, "series page unchanged in this change");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
