/** Loanwords marked in the glossary are italicised in the story text too, and nothing else is touched. */
import { foreignWordsOfGlossary, italiciseBody } from "../src/lib/admin/authoring/italicise-body";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

const words = foreignWordsOfGlossary([
  { term: "*tasmi'*", meaning: "Memperdengarkan bacaan kepada guru." },
  { term: "murajaah", meaning: "Mengulang hafazan; bahasa Arab *muraja'ah*." },
  { term: "**tebal**", meaning: "Bukan condong." },
  { term: "qiraat", meaning: null, original_language: "Arab" },
  { term: "kampung", meaning: "Desa.", original_language: "Melayu" }
]);
assert(words.includes("qiraat") && !words.includes("kampung"), "a term whose language of origin is not Malay is a loanword too", words);
assert(words.includes("tasmi'") && words.includes("muraja'ah"), "words between single asterisks, in a term or a meaning, are the foreign words", words);
assert(!words.includes("tebal") && !words.includes("murajaah"), "bold and unmarked words are not foreign words", words);

const r = italiciseBody("Izhar pergi tasmi' pagi itu. Selepas tasmi'nya, dia pulang. Tasmi' lagi.", ["tasmi'"]);
assert(r.text === "Izhar pergi *tasmi'* pagi itu. Selepas *tasmi'*nya, dia pulang. *Tasmi'* lagi.", "whole words, with -nya outside the italics and the capital kept", r.text);
assert(r.count === 3 && r.perWord["tasmi'"] === 3, "the changes are counted", r);

const again = italiciseBody(r.text, ["tasmi'"]);
assert(again.text === r.text && again.count === 0, "running it again changes nothing");

const keep = italiciseBody("Dia berkata **spot** dan *spot* lagi, lalu spot.", ["spot"]);
assert(keep.text === "Dia berkata **spot** dan *spot* lagi, lalu *spot*.", "bold and existing italics are left as they are", keep.text);

const inside = italiciseBody("Hotspot dan spotlight tidak berubah.", ["spot"]);
assert(inside.text === "Hotspot dan spotlight tidak berubah." && inside.count === 0, "a word inside another word is not touched", inside.text);

const heading = italiciseBody("## Spot check\n\nSpot check bermula.", ["spot check"]);
assert(heading.text === "## Spot check\n\n*Spot check* bermula.", "headings are skipped, a phrase is matched whole", heading.text);

const longer = italiciseBody("Soalan spot question tadi.", ["spot", "spot question"]);
assert(longer.text === "Soalan *spot question* tadi.", "the longer phrase wins over the shorter word", longer.text);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
