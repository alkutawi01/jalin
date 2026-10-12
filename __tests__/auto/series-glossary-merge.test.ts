/** A series has one glossary; an episode adds or overrides terms; the reader sees the two merged. */
import fs from "node:fs";
import path from "node:path";
import { glossaryKey, mergeSeriesGlossary } from "../../src/lib/content/glossary-merge";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8").replace(/\r\n/g, "\n");
const e = (term: string, meaning = "makna " + term) => ({ term, meaning, source: "Kamus Dewan Edisi Keempat" });

const series = [e("murajaah"), e("qiraat"), e("tasmi'"), e("mushaf")];
assert(mergeSeriesGlossary(undefined, [e("a")]).length === 1, "no series glossary: the episode's own terms, unchanged");
assert(mergeSeriesGlossary([], [e("a")])[0].term === "a", "an empty series glossary changes nothing");
assert(mergeSeriesGlossary(series, []).map((t) => t.term).join(",") === "murajaah,qiraat,tasmi',mushaf", "an episode with none of its own shows the series' terms");

const merged = mergeSeriesGlossary(series, [e("qiraat", "bacaan khusus episod ini"), e("hafiz")]);
assert(merged.map((t) => t.term).join(",") === "qiraat,hafiz,murajaah,tasmi',mushaf", "own terms first, then the series' terms the episode did not define");
assert(merged[0].meaning === "bacaan khusus episod ini", "an episode that defines a term wins over the series");
assert(mergeSeriesGlossary(series, [e("Murajaah")]).filter((t) => glossaryKey(t.term) === "murajaah").length === 1, "case does not make a second entry");
assert(mergeSeriesGlossary(series, [e("tasmi")]).filter((t) => glossaryKey(t.term) === "tasmi").length === 1, "tasmi and tasmi' are one word, never two entries");
assert(mergeSeriesGlossary(series, [e("  "), e("")]).length === 4, "an entry with no term is dropped");
assert(glossaryKey("Tasmi\u2019") === "tasmi" && glossaryKey("tasmi\u02BC") === "tasmi" && glossaryKey("  Ma'rifat ") === "marifat", "apostrophes and hamza marks are folded");

const migration = read("src/lib/db/migrations/033_series_glossary.ts");
assert(migration.includes("CREATE TABLE IF NOT EXISTS series_glossary_terms") && migration.includes("REFERENCES series(id) ON DELETE CASCADE"), "the table belongs to a series and goes with it");
assert(migration.includes("CREATE UNIQUE INDEX IF NOT EXISTS uq_series_glossary_term ON series_glossary_terms (series_id, lower(term))"), "a term is unique within a series, ignoring case");
const repo = read("src/lib/content/database-repository.ts");
assert(repo.includes("mergeSeriesGlossary(seriesGlossary.get(this.seriesIdByWorkId.get(wid) ?? \"\"), revisionWork.glossary)") && repo.includes("work.glossary = mergeSeriesGlossary("), "a published episode is merged on both ways it is built (revision snapshot and working copy)");
assert(repo.includes('selectFrom("series_glossary_terms")') && /catch \{\n\s*\/\* the table is not there yet \*\//.test(repo), "a database without the table still loads");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
