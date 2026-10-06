/**
 * A genre is shown with a capital first letter whatever the editor typed: "Sinopsis · sejarah" and "Sinopsis · Sejarah",
 * "drama keluarga" and "Drama Sosial" were on the site side by side. Only the display changes; the stored value is not touched.
 */
import { displayableGenre } from "../src/lib/reader/genre-display";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(displayableGenre("sejarah") === "Sejarah" && displayableGenre("drama keluarga") === "Drama keluarga", "a genre typed in small letters is shown with a capital first letter");
assert(displayableGenre("Sejarah") === "Sejarah" && displayableGenre("Drama Sosial") === "Drama Sosial" && displayableGenre("  Fiksyen Sains ") === "Fiksyen Sains", "a genre already written with capitals is left as it is (and trimmed)");
assert(displayableGenre("") === undefined && displayableGenre("   ") === undefined && displayableGenre(null) === undefined && displayableGenre(undefined) === undefined, "an empty genre is not shown");
assert(displayableGenre("needs_review") === undefined && displayableGenre("Needs Review") === undefined && displayableGenre("—") === undefined, "a placeholder is still never shown");
assert(displayableGenre("1980-an") === "1980-an" && displayableGenre("élan") === "Élan", "a genre that starts with a digit is left alone; an accented letter is capitalised");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
