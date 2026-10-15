import assert from "node:assert/strict";
import fs from "node:fs";
import { COUNTRIES, cleanCountryText, countryLabel, countryName, normaliseCountries, readingLine, MAX_COUNTRIES, MAX_COUNTRY_LENGTH } from "../src/lib/reader/countries";
import { workEyebrow } from "../src/lib/reader/story-collection";
import { publicCharacters } from "../src/lib/reader/visible-characters";

// Negara latar: one principal country/region only; Malaysia alone is hidden.
assert.equal(countryLabel(undefined), undefined, 'no country: nothing shown');
assert.equal(countryLabel([]), undefined, 'empty list: nothing shown');
assert.equal(countryLabel(['MY']), undefined, 'a stored Malaysia code is not shown (Jalin is Malaysian)');
assert.equal(countryLabel(['Malaysia']), undefined, 'Malaysia typed by hand is not shown either');
assert.equal(countryLabel([' malaysia ']), undefined, 'case and spaces do not matter');
assert.equal(countryLabel(['JP']), 'Jepun', 'the codes stored on the first works still read as names');
assert.equal(countryLabel(['GB-ENG']), 'England');
assert.equal(countryLabel(['KR']), 'Korea');
assert.equal(countryLabel(['Empayar Inka']), 'Empayar Inka', 'an older region typed by the editor is shown as typed');
assert.equal(countryLabel(['Al-Andalus']), 'Al-Andalus');
assert.equal(countryLabel(['MY', 'ID']), undefined, 'only the first principal country is used, and Malaysia alone stays hidden');
assert.equal(cleanCountryText('Czechoslovakia \\\\ -Britain \\\\'), 'Czechoslovakia', 'everything after a leaked chatbot separator is discarded');
assert.deepEqual(normaliseCountries(['Czechoslovakia \\\\ -Britain \\\\']), ['Czechoslovakia'], 'formatting debris and the appended country never reach storage');

// Entries are trimmed, unique, short and limited to the first principal country; anything else is dropped.
assert.deepEqual(normaliseCountries(['  Jepun  ', 'jepun', 5, 'Norway', 'Peru']), ['Jepun']);
assert.deepEqual(normaliseCountries(['x'.repeat(MAX_COUNTRY_LENGTH + 1)]), [], 'too long for a card');
assert.deepEqual(normaliseCountries(['<b>Jepun</b>']), [], 'no markup');
assert.equal(MAX_COUNTRIES, 1);
assert.deepEqual(normaliseCountries('Jepun'), [], 'not a list: nothing');
assert.equal(countryName('PE'), 'Peru');
assert.equal(countryName('Empayar Inka'), 'Empayar Inka');
assert.deepEqual(publicCharacters([{ name: 'Grete Winton', role: 'Isteri Nicholas dan penemu rekod lama ____' }]), [{ name: 'Grete Winton', role: 'Isteri Nicholas dan penemu rekod lama' }]);

// The suggestions are plain Malay names, never bare codes.
for (const [code, name] of Object.entries(COUNTRIES)) {
  assert.ok(name.trim().length > 1, code + ' has a display name');
  assert.doesNotMatch(name, /^[A-Z]{2}(-[A-Z]{3})?$/, code + ' is displayed with a name, not its code');
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
assert.ok(page.includes("country: work.country") && page.includes("reading: readingLabel(work.readingMinutes)"), "the hero carries country and reading time separately");

console.log("country label: passed");
