import assert from "node:assert/strict";
import fs from "node:fs";
import { COUNTRIES, countryLabel, normaliseCountries, readingLine, MAX_COUNTRIES } from "../src/lib/reader/countries";
import { workEyebrow } from "../src/lib/reader/story-collection";

// Negara latar (12 Okt 2026, Izzat): the country only, Malaysia alone is hidden, two countries only when the story truly belongs to both.
assert.equal(countryLabel(undefined), undefined, "no countries: nothing shown");
assert.equal(countryLabel([]), undefined, "empty list: nothing shown");
assert.equal(countryLabel(["MY"]), undefined, "Malaysia alone is not shown (Jalin is Malaysian)");
assert.equal(countryLabel(["JP"]), "Jepun");
assert.equal(countryLabel(["NO"]), "Norway");
assert.equal(countryLabel(["MA"]), "Maghribi");
assert.equal(countryLabel(["GB-ENG"]), "England", "readers know England, not 'United Kingdom', for a Manchester story");
assert.equal(countryLabel(["KR"]), "Korea");
assert.equal(countryLabel(["MY", "ID"]), "Malaysia-Indonesia", "two countries are joined by a hyphen, first one first");
assert.equal(countryLabel(["ID", "MY"]), "Indonesia-Malaysia");
assert.equal(countryLabel(["jp"]), "Jepun", "codes are case-insensitive");

// Anything unknown or repeated is dropped and the list is capped at two.
assert.deepEqual(normaliseCountries(["JP", "JP", "XX", 5, "NO", "PE"]), ["JP", "NO"]);
assert.equal(MAX_COUNTRIES, 2);
assert.deepEqual(normaliseCountries("JP"), [], "not a list: nothing");
assert.equal(countryLabel(["XX"]), undefined, "an unknown code shows nothing rather than the code");

// Every dictionary name is plain text a reader can understand: no codes or empty names.
for (const [code, name] of Object.entries(COUNTRIES)) {
  assert.ok(name.trim().length > 1, `${code} has a display name`);
  assert.doesNotMatch(name, /^[A-Z]{2}(-[A-Z]{3})?$/, `${code} is displayed with a name, not its code`);
}

// The small line above a card's title is format and genre only; the country sits beside the reading time (the three-part eyebrow
// was too long: 'Sinopsis · Drama sosial · Amerika Syarikat').
assert.equal(workEyebrow({ type: 'cerpen', genre: 'sejarah' }), 'Cerpen · Sejarah');
assert.equal(workEyebrow({ type: 'cerpen' }), 'Cerpen');
assert.equal(readingLine('Jepun', 11), 'Jepun · ± 11 minit');
assert.equal(readingLine(undefined, 11), '± 11 minit', 'no country: the reading time alone, as before');
assert.equal(readingLine('Peru', undefined), 'Peru');
assert.equal(readingLine(undefined, undefined), '');

const page = fs.readFileSync("src/app/page.tsx", "utf8");
assert.doesNotMatch(page, /Pilihan Editor ·/, "'Pilihan Editor' is not part of the hero eyebrow any more (the carousel is the editor's picks)");
assert.ok(page.includes("[work.country, readingLabel(work.readingMinutes)]"), "the hero slide shows the country beside the reading time");

console.log("country label: passed");
