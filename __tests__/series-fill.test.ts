/** The Siri baharu form's AI prompt and the reader of the chatbot's answer. */
import { composeSeriesPrompt, parseSeriesAnswer } from "../src/lib/admin/series-fill";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const prompt = composeSeriesPrompt();
assert(prompt.includes("halaman SIRI") && prompt.includes("Kanak-kanak, Remaja, Belia, Dewasa"), "prompt targets the series page and lists the audience bands");
assert(!prompt.includes("Maya"), "prompt names no persona");

const a = parseSeriesAnswer("```\nTajuk: Sehingga Ayat Terakhir\nBlurb: Dua jiwa, satu surat.\nGenre: Drama\nAudiens: Belia, Dewasa\nMod: Bersambung\nStatus: Masih diteruskan\n```");
assert(a.title === "Sehingga Ayat Terakhir" && a.slug === "sehingga-ayat-terakhir", "title fills and the slug follows it");
assert(a.dek === "Dua jiwa, satu surat." && a.genre === "Drama", "blurb and genre read");
assert(a.audience === "belia,dewasa", "audience labels become stored codes");
assert(a.mode === "continuous" && a.status === "ongoing", "mode and status read");

const b = parseSeriesAnswer("**Tajuk:** Kisah Lain\n**Mod:** Antologi\n**Status:** Tamat\nNota: abaikan");
assert(b.title === "Kisah Lain" && b.mode === "anthology" && b.status === "completed", "bold labels read; antologi and tamat map");
assert(Object.keys(parseSeriesAnswer("tiada apa-apa")).length === 0, "an answer with no labels fills nothing");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
