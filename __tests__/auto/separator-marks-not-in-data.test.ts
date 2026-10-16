/** The chatbot's separator line ("____", "_ _ _ _", or the escaped "\_\_\_\_") never reaches a name, a role, a place or a country. */
import { stripSeparatorMarks, stripSeparatorTail, unescapeSeparatorRuns } from "../../src/lib/separator-marks";
import { cleanCountryText, countryLabel, normaliseCountries } from "../../src/lib/reader/countries";
import { publicCharacters } from "../../src/lib/reader/visible-characters";
import { publicPlaces, publicTimes } from "../../src/lib/reader/places";
import { tidyShort } from "../../src/lib/capitalise-first";
import { parseWorkFill } from "../../src/lib/admin/authoring/work-fill";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const ESC = "\\_\\_\\_\\_"; // what was stored: backslash, underscore, four times

// the exact data seen on the public pages (work "250 Tempat yang Kosong")
assert(stripSeparatorMarks(`Penggerak utama pemindahan kanak-kanak ${ESC}`) === "Penggerak utama pemindahan kanak-kanak", "an escaped separator is removed from a role");
assert(stripSeparatorMarks("Czechoslovakia _ _ _ _") === "Czechoslovakia", "a spaced separator is removed");
assert(stripSeparatorMarks("Prague ____") === "Prague", "a plain separator is removed");
assert(stripSeparatorMarks("Hotel di Prague") === "Hotel di Prague", "a clean text is untouched");
assert(stripSeparatorTail(`Bandar utama. ${ESC}`) === "Bandar utama.", "the tail cleaner removes it at the end");

assert(cleanCountryText(`Czechoslovakia ${ESC}`) === "Czechoslovakia", "a country loses the separator");
assert(JSON.stringify(normaliseCountries([`Czechoslovakia ${ESC}`, `Britain ${ESC}`])) === JSON.stringify(["Czechoslovakia"]), "and only one country is kept");
assert(countryLabel([`Czechoslovakia ${ESC}`, `Britain ${ESC}`]) === "Czechoslovakia", "the card shows the one country");

const chars = publicCharacters([{ name: "Nicholas Winton", role: `Penggerak utama pemindahan kanak-kanak ${ESC}` }]);
assert(chars.length === 1 && chars[0]!.role === "Penggerak utama pemindahan kanak-kanak", "a character's role is clean for the reader");
assert(publicPlaces({ places: [{ name: "Prague", description: `Bandar utama tempat permohonan diuruskan. ${ESC}` }] })[0]!.description === "Bandar utama tempat permohonan diuruskan.", "a place's note is clean");
assert(publicTimes({ times: [{ name: "1938", description: `Tahun penyerahan wilayah Sudeten. ${ESC}` }] })[0]!.description === "Tahun penyerahan wilayah Sudeten.", "a time's note is clean");
assert(tidyShort(`Ibu pelarian ${ESC}`) === "Ibu pelarian", "a saved short text is clean");

// at the source: the answer itself
assert(unescapeSeparatorRuns(`Peranan: Ibu ${ESC}`) === "Peranan: Ibu ____", "an escaped run in an answer becomes a plain separator");
const fill = parseWorkFill(`[KARYA]\nTajuk: Contoh\n\n[WATAK]\nNama: Nicholas Winton\nPeranan: Penggerak utama ${ESC}\n${ESC}\nNama: Martin Blake\nPeranan: Kenalan ${ESC}\n\n[LATAR]\nJenis: negara\nNama: Czechoslovakia ${ESC}\n`);
assert(fill.characters.length === 2 && fill.characters.every((c) => !/_/.test(c.role) && !/_/.test(c.name)), "characters read from an answer with escaped separators are clean");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
