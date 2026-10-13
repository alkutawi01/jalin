import { isDictionaryWord, unitaliciseDictionaryWords } from "../src/lib/reader/dictionary-words";
import { fixEmphasisBeforeSuffix } from "../src/lib/reader/emphasis-fix";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(unitaliciseDictionaryWords("Sebuah buku *qiraat* berkulit hijau.") === "Sebuah buku qiraat berkulit hijau.", "a word in Kamus Dewan loses its italics");
assert(unitaliciseDictionaryWords("*Qiraat* dan *murajaah* dan *hafiz*.") === "Qiraat dan murajaah dan hafiz.", "case is ignored and several in a line are all cleared");
assert(unitaliciseDictionaryWords("Dia membawa *mushaf* dan *tasmi'* serta *talaqqi*.") === "Dia membawa *mushaf* dan *tasmi'* serta *talaqqi*.", "a word that is not in Kamus Dewan keeps its italics");
assert(unitaliciseDictionaryWords("Itu *bacaan qiraat Hafs* sahaja.") === "Itu *bacaan qiraat Hafs* sahaja.", "a marked phrase is not changed");
assert(unitaliciseDictionaryWords("Itu **qiraat** tebal.") === "Itu **qiraat** tebal.", "bold is not changed");
assert(isDictionaryWord("Tahfiz") && !isDictionaryWord("mushaf"), "the lookup ignores case and knows what is listed");
assert(unitaliciseDictionaryWords(fixEmphasisBeforeSuffix("Ilmu *qiraat-*nya mendalam.")) === "Ilmu qiraat-nya mendalam.", "a word with a suffix and a hyphen is also cleared");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
