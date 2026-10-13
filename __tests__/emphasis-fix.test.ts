import { fixEmphasisBeforeSuffix } from "../src/lib/reader/emphasis-fix";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(fixEmphasisBeforeSuffix("Bacaan *talaqqi-*nya bermula.") === "Bacaan *talaqqi*-nya bermula.", "the hyphen moves out of the italic so the span closes");
assert(fixEmphasisBeforeSuffix("*talaqqi*-nya") === "*talaqqi*-nya", "text that already closes is left alone");
assert(fixEmphasisBeforeSuffix("Dia *membaca* buku.") === "Dia *membaca* buku.", "an ordinary italic word is left alone");
assert(fixEmphasisBeforeSuffix("Itu **tebal-**nya.") === "Itu **tebal**-nya.", "the same for bold");
assert(fixEmphasisBeforeSuffix("*satu-*nya dan *dua-*lah") === "*satu*-nya dan *dua*-lah", "more than one in a line");
assert(fixEmphasisBeforeSuffix("2 * 3 - * 4") === "2 * 3 - * 4", "a lone asterisk in a sum is not an italic");
assert(fixEmphasisBeforeSuffix("*kata,* lalu") === "*kata,* lalu", "punctuation followed by a space already closes");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
