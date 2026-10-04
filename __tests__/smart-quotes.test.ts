/** House quotation style: “double” for speech, ‘single’ only inside a double quotation; unclear cases are left alone. */
import { smartQuotes } from "../src/lib/admin/smart-quotes";

let passed = 0;
let failed = 0;
function eq(actual: string, expected: string, msg: string) {
  if (actual === expected) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}\n      got:      ${JSON.stringify(actual)}\n      expected: ${JSON.stringify(expected)}`); }
}

eq(smartQuotes('"Mak, hujan!" jerit Alia.'), "“Mak, hujan!” jerit Alia.", "speech at the start of a line");
eq(smartQuotes('Dia kata "tidak".'), "Dia kata “tidak”.", "a quoted word inside a sentence, full stop after");
eq(smartQuotes('Kata "dia," lalu pergi.'), "Kata “dia,” lalu pergi.", "comma before the closing mark");
eq(smartQuotes('"Dia berkata, \'Pergi!\' lalu keluar."'), "“Dia berkata, ‘Pergi!’ lalu keluar.”", "single marks only inside a double quotation");
eq(smartQuotes("Dia kata 'tidak' sahaja."), "Dia kata 'tidak' sahaja.", "single marks outside any double quotation are left alone");
eq(smartQuotes('"Maaf, ma\'af sangat."'), "“Maaf, ma'af sangat.”", "an apostrophe inside a word is never touched");
eq(smartQuotes('—"Hai," katanya.'), "—“Hai,” katanya.", "after a dash the mark opens");
eq(smartQuotes('Kata:"Hai"'), "Kata:“Hai”", "a quotation straight after a colon opens, so the pair is never half converted");

// typing one character at a time: nothing flips wrongly in between
eq(smartQuotes('"'), '"', "a lone mark is left until there is something to quote");
eq(smartQuotes('Dia "'), 'Dia "', "an opening mark with nothing after it yet is left");
eq(smartQuotes('Dia "H'), "Dia “H", "it opens as soon as the next letter is typed");
eq(smartQuotes('Dia "Hai"'), "Dia “Hai”", "typing the closing mark closes it at once");
eq(smartQuotes('x"y'), 'x"y', "a mark between letters is ambiguous and left alone");
eq(smartQuotes('" "'), '" "', "a mark with spaces on both sides is left alone");

// never touched
eq(smartQuotes("“Sudah” ‘ini’"), "“Sudah” ‘ini’", "already curly text is unchanged");
eq(smartQuotes('Lihat [[gambar:"1"]] dan "ok"'), 'Lihat [[gambar:"1"]] dan “ok”', "image markers are not prose");
eq(smartQuotes('Guna `a "b"` lalu "c"'), 'Guna `a "b"` lalu “c”', "inline code is not prose");
eq(smartQuotes('```\nx = "a"\n```\n"b"'), '```\nx = "a"\n```\n“b”', "fenced code is not prose");
eq(smartQuotes("tiada petikan di sini"), "tiada petikan di sini", "text without quotes is returned as is");

// each paragraph on its own
eq(smartQuotes('"Satu paragraf\n\n"Dua paragraf"'), '"Satu paragraf\n\n“Dua paragraf”'.replace('"Satu', "“Satu"), "an unclosed speech does not leak into the next paragraph");

// shape guarantees
const samples = ['"A" \'b\' "c \'d\' e"', '\u{1F600} "Hai" \u{1F600} `x"y` "z"', 'a "b" c "d', "x'y \"z'"];
eq(String(samples.every((s) => smartQuotes(s).length === s.length)), "true", "output is always the same length (the caret cannot move)");
eq(String(samples.every((s) => smartQuotes(smartQuotes(s)) === smartQuotes(s))), "true", "running it twice changes nothing");

const big = ('"Hujan turun, kata dia." Mak diam. '.repeat(8000));
const t0 = Date.now();
const converted = smartQuotes(big);
const ms = Date.now() - t0;
eq(String(converted.length === big.length && ms < 1500), "true", `a 280k-character manuscript converts quickly (${ms} ms)`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
