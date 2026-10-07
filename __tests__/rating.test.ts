/**
 * Ratings ("Penilaian"): the rubric's arithmetic, the whole text and its reference code, the instruction for the chatbot,
 * and the reading of a pasted answer (forgiving about decoration, strict about substance).
 */
import fs from "node:fs";
import path from "node:path";
import { COMPONENTS, RUBRIC_VERSION, VERDICT_MAX_WORDS, consensus, formatScore, isRatedType, isValidScore, overallScore, rubricText, scoreLabel } from "../src/lib/admin/rating/rubric";
import { assembleFullText, fullTextFileName, partHeading, referenceCode, textHash } from "../src/lib/admin/rating/full-text";
import { BLOCK_CLOSE, BLOCK_OPEN, buildRatingPrompt } from "../src/lib/admin/rating/prompt";
import { canonicalReviewer, parseRatingPaste, quoteIsInText, normaliseForMatch } from "../src/lib/admin/rating/parse";
import { isAllowed, permissionFor } from "../src/lib/admin/permissions";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// ── rubric
assert(COMPONENTS.length === 7 && COMPONENTS.every((c) => [2, 4, 6, 8, 10].every((n) => c.anchors[n as 2].length > 30)), "seven parts, each with written anchors at 2, 4, 6, 8 and 10");
assert(isValidScore(0) && isValidScore(10) && !isValidScore(11) && !isValidScore(-1) && !isValidScore(7.5) && !isValidScore("8"), "a score is a whole number from 0 to 10");
const even = Object.fromEntries(COMPONENTS.map((c) => [c.key, 8]));
assert(overallScore(even) === 8 && overallScore({ ...even, plot: 9 }) === 8.14 && formatScore(8.14) === "8.1", "the overall number is the mean of the seven, kept to two places and shown to one");
let threw = false;
try { overallScore({ plot: 8 }); } catch { threw = true; }
assert(threw, "an overall number is not worked out from fewer than seven scores");
assert(consensus([]) === null && consensus([8]) === 8 && consensus([7, 9, 8.5]) === 8.5 && consensus([7, 9]) === 8 && consensus([10, 2, 8, 8.4]) === 8.2, "the consensus is the middle of the raters (the mean of the two middle ones when even), not swayed by one far-off rater");
assert(scoreLabel(9.2) === "Sangat disyorkan" && scoreLabel(8) === "Disyorkan" && scoreLabel(7.9) === "Baik" && scoreLabel(5) === "Lemah" && scoreLabel(3.9) === "Tidak disyorkan", "the word for a number is worked out mechanically");
assert(isRatedType("cerpen") && isRatedType("novela") && isRatedType("bersiri") && !isRatedType("sinopsis") && !isRatedType("fragmen"), "a synopsis and a fragment are not rated");

// ── whole text and its code
const story = `Hujan turun sejak subuh. Mak Som menadah baldi di bawah atap yang bocor, satu demi satu, seperti orang menyusun doa.

"Kau balik juga akhirnya," katanya tanpa menoleh.

Amir meletakkan beg di tangga. Dia tidak menjawab; jawapan yang dia bawa dari kota terlalu berat untuk diucapkan di beranda.

Petang itu mereka makan nasi dengan ikan kering, dan tiada siapa menyebut tentang surat itu.`;
const whole = assembleFullText({ title: "Atap Bocor", kindLabel: "Cerpen", parts: [{ heading: "", body: story }] });
assert(whole.startsWith("Atap Bocor\n(Cerpen)\n") && whole.includes("seperti orang menyusun doa"), "the whole text starts with the title and the kind");
const novela = assembleFullText({ title: "N", kindLabel: "Novela", parts: [{ heading: partHeading("Bab", 1, "Permulaan"), body: "satu\n\n![gambar](/x.png)\n\ndua" }, { heading: partHeading("Bab", 2, "BAB 2"), body: "tiga" }, { heading: "Bab 3", body: "   " }] });
assert(novela.includes("=== Bab 1: Permulaan ===") && novela.includes("=== Bab 2 ===") && !novela.includes("Bab 2: BAB 2") && !novela.includes("![gambar]") && !novela.includes("Bab 3"), "chapters come in order under their headings; a picture line and an empty chapter are left out; 'BAB 2' is not said twice");
assert(textHash("a\r\nb  \n") === textHash("a\nb") && textHash("a\nb") !== textHash("a\nc"), "the hash is the same for the same text whatever the line endings, and different for a changed text");
const code = referenceCode("work", "w1", textHash(whole), RUBRIC_VERSION);
assert(/^JP-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code) && !/[ILOU01]/.test(code.slice(3)) && code === referenceCode("work", "w1", textHash(whole), RUBRIC_VERSION), "the reference code is short, has no letters that are mistaken for one another, and is the same every time for the same text");
assert(code !== referenceCode("work", "w2", textHash(whole), RUBRIC_VERSION) && code !== referenceCode("work", "w1", textHash(whole + "x"), RUBRIC_VERSION) && code !== referenceCode("series", "w1", textHash(whole), RUBRIC_VERSION) && code !== referenceCode("work", "w1", textHash(whole), "LAIN"), "another work, a changed text, another kind or another rubric gives another code");
assert(fullTextFileName("Kerusi di Beranda!") === "kerusi-di-beranda-teks-penuh.txt" && fullTextFileName("") === "karya-teks-penuh.txt", "the download has a safe file name");

// ── the instruction
const prompt = buildRatingPrompt({ type: "cerpen", title: "Atap Bocor", code, text: whole });
assert(prompt.includes(code) && prompt.includes(BLOCK_OPEN) && prompt.includes(BLOCK_CLOSE) && prompt.includes(rubricText()) && prompt.includes("seperti orang menyusun doa"), "the instruction carries the code, the rubric, the block to answer in and the whole text");
assert(prompt.includes("6 ialah aras lalai") && prompt.includes("9 dan 10 jarang") && prompt.includes(`tidak lebih ${VERDICT_MAX_WORDS} patah perkataan`) && prompt.includes("DISALIN TEPAT"), "it sets 6 as the default, makes 9 and 10 rare, limits the verdict to 30 words and asks for exact quotes");
const withFile = buildRatingPrompt({ type: "bersiri", title: "Siri", code });
assert(!withFile.includes("<<<TEKS") && withFile.includes("fail yang dilampirkan") && withFile.includes("TEKS TIDAK LENGKAP") && withFile.includes("siri (semua episod)"), "without the text it asks for the attached file, and for no rating at all if the file cannot be read");
assert(!prompt.includes("13") && !/remaja/i.test(prompt) && !/maya/i.test(prompt), "the instruction does not steer the rater towards an age band or mention Maya");

// ── reading an answer
const QUOTES: Record<string, string> = {
  plot: "Hujan turun sejak subuh",
  watak: "Dia tidak menjawab; jawapan yang dia bawa dari kota terlalu berat",
  bahasa: "satu demi satu, seperti orang menyusun doa",
  dialog: "Kau balik juga akhirnya",
  tema: "tiada siapa menyebut tentang surat itu",
  emosi: "terlalu berat untuk diucapkan di beranda",
  keaslian: "Mak Som menadah baldi di bawah atap yang bocor"
};
const SCORES: Record<string, number> = { plot: 7, watak: 8, bahasa: 9, dialog: 7, tema: 8, emosi: 8, keaslian: 6 };
const REVIEW = Array.from({ length: 30 }, () => "Cerpen ini menahan diri dengan baik.").join(" ");
function answer(over: { code?: string; reviewer?: string; scores?: Record<string, string | number>; quotes?: Record<string, string>; verdict?: string; review?: string; weakness?: string; drop?: string } = {}): string {
  const parts = COMPONENTS.filter((c) => c.key !== over.drop).map((c) => `${c.label} — Skor: ${over.scores?.[c.key] ?? SCORES[c.key]}\nSebab: Alasan khusus untuk ${c.label.toLowerCase()} dalam teks ini.\nBukti: "${over.quotes?.[c.key] ?? QUOTES[c.key]}"`).join("\n\n");
  return `${BLOCK_OPEN}
Kod Rujukan: ${over.code ?? code}
Penilai: ${over.reviewer ?? "ChatGPT"}

${parts}

Sesuai Untuk: Pembaca remaja akhir dan dewasa yang gemar cerita keluarga yang tenang
Verdict: ${over.verdict ?? "Sebuah cerpen yang membiarkan diam berkata lebih banyak daripada dialognya."}
Ulasan: ${over.review ?? REVIEW}
Kekuatan 1: Imejan hujan yang konsisten
Kekuatan 2: Dialog yang menahan diri
Kekuatan 3: tidak dinyatakan
Kelemahan 1: ${over.weakness ?? "Penyelesaian terlalu terbuka"}
Kelemahan 2: tidak dinyatakan
Kelemahan 3: tidak dinyatakan
Amaran Kandungan: tiada
${BLOCK_CLOSE}`;
}
const opts = { expectedCode: code, text: whole };
const good = parseRatingPaste(answer(), opts);
assert(good.ok && good.rating.reviewer === "ChatGPT" && good.rating.scores.bahasa === 9 && good.rating.overall === 7.57 && good.warnings.length === 0, "a clean answer is read: rater, seven scores, and the overall number worked out here (7.57)");
assert(good.ok && COMPONENTS.every((c) => good.rating.evidence[c.key].verified) && good.rating.strengths.length === 2 && good.rating.weaknesses.length === 1 && good.rating.contentWarnings === "", "every quote is found in the text; 'tidak dinyatakan' and 'tiada' are empty");

const dressed = `Baik, ini penilaian saya:\n\n\`\`\`\n${answer({ reviewer: "**Claude (Opus)**" }).replace(/^(.+) — Skor: (\d+)$/gm, "**$1** - Skor: $2/10").replace(/^Sebab:/gm, "- Sebab:").replace(/^Verdict:/m, "**Verdict:**")}\n\`\`\`\n\nSemoga membantu!`;
const d = parseRatingPaste(dressed, opts);
assert(d.ok && d.rating.reviewer === "Claude" && d.rating.scores.plot === 7 && d.rating.verdict.startsWith("Sebuah cerpen"), "words before and after the block, a code fence, bold marks, bullets, a hyphen for the dash and '7/10' do no harm");
assert(canonicalReviewer("GPT-5 Thinking") === "ChatGPT" && canonicalReviewer("Gemini 3 Pro") === "Gemini" && canonicalReviewer("Model X") === "Model X", "a model's name is evened out to its family; an unknown one is kept as written");

const errorsOf = (raw: string) => { const r = parseRatingPaste(raw, opts); return r.ok ? [] : r.errors; };
assert(errorsOf("").length === 1 && errorsOf("Ini penilaian saya tanpa blok.")[0].includes("tidak ditemui"), "nothing pasted, or no block, is turned away");
assert(errorsOf(answer().replace(BLOCK_CLOSE, ""))[0].includes("terpotong") && errorsOf(answer() + "\n" + answer())[0].includes("lebih daripada satu"), "a cut-off answer and two answers at once are turned away");
assert(errorsOf(answer({ code: "JP-AAAA-BBBB" })).some((e) => e.includes("bukan kod teks karya ini")), "an answer with another reference code (another work, or the text has changed) is turned away");
assert(errorsOf(answer({ scores: { plot: "8.5" } })).some((e) => e.includes("nombor bulat")) && errorsOf(answer({ scores: { plot: 11 } })).length === 1 && errorsOf(answer({ scores: { plot: "lapan" } })).length === 1, "8.5, 11 and a word are not scores");
assert(errorsOf(answer({ drop: "dialog" })).some((e) => e.includes('"Dialog" tiada')), "a missing part is said by name");
assert(errorsOf(answer({ verdict: Array.from({ length: 31 }, () => "kata").join(" ") })).some((e) => e.includes("had ialah 30")) && parseRatingPaste(answer({ verdict: Array.from({ length: 30 }, () => "kata").join(" ") }), opts).ok, "a verdict of 31 words is turned away; 30 is accepted");
assert(errorsOf(answer({ review: "Terlalu pendek." })).some((e) => e.includes("terlalu pendek")) && errorsOf(answer({ weakness: "tidak dinyatakan" })).some((e) => e.includes("Kelemahan")), "a review of a few words, or a rating with no weakness, is turned away");
assert(errorsOf(answer({ reviewer: "(nama model anda, contohnya ChatGPT, Claude, Gemini)" })).some((e) => e.includes("Penilai")), "the template's own hint is not a rater's name");

const oneOff = parseRatingPaste(answer({ quotes: { ...QUOTES, tema: "mereka semua diam tentang surat" } }), opts);
assert(oneOff.ok && !oneOff.rating.evidence.tema.verified && oneOff.warnings.some((w) => w.includes("Tema & Makna")), "one quote that is not in the text is a warning on that part, not a refusal");
const invented = Object.fromEntries(COMPONENTS.map((c, i) => [c.key, i < 4 ? `petikan rekaan nombor ${i} yang tiada dalam teks` : QUOTES[c.key]]));
assert(errorsOf(answer({ quotes: invented })).some((e) => e.includes("4 daripada 7 petikan")), "four quotes that are not in the text turn the whole answer away");
assert(quoteIsInText("“Kau balik juga akhirnya,”", normaliseForMatch(whole)) && quoteIsInText("...seperti orang   menyusun doa.", normaliseForMatch(whole)) && !quoteIsInText("doa", normaliseForMatch(whole)), "curly quotes, an ellipsis at the ends and extra spaces do not hide a real quote; three letters prove nothing");
const same = parseRatingPaste(answer({ scores: Object.fromEntries(COMPONENTS.map((c) => [c.key, 8])) }), opts);
assert(same.ok && same.warnings.some((w) => w.includes("skor yang sama")), "seven identical scores are flagged");
assert(errorsOf("TEKS TIDAK LENGKAP")[0].includes("teks tidak lengkap"), "a chatbot that could not read the file says so, and that is passed on");

// ── wiring
assert(permissionFor("POST", "/api/admin/ratings") === "editorial.curate" && permissionFor("PATCH", "/api/admin/ratings/abc") === "editorial.curate" && permissionFor("GET", "/api/admin/ratings") === "content.read" && permissionFor("GET", "/api/admin/full-text") === "content.read", "pasting in or publishing a rating needs the curating permission; reading and the text download need only reading");
assert(!isAllowed("editor", "POST", "/api/admin/ratings") && isAllowed("chief_editor", "POST", "/api/admin/ratings") && isAllowed("editor", "GET", "/api/admin/full-text"), "an ordinary editor may download the text but not keep a rating");
const service = read("src/lib/admin/rating/rating-service.ts");
assert(service.includes('series.status !== "completed"') && service.includes('type === "bersiri"') && !/\.set\(\{[^}]*(scores|verdict|review)/.test(service), "a series still going on and a single episode are not rated; a kept rating's numbers and words are never changed");
const migration = read("src/lib/db/migrations/025_ratings.ts");
assert(migration.includes('createTable("ratings")') && migration.includes("information_schema.tables") && migration.includes('dropTable("ratings")'), "the migration adds one table, guarded, and can be undone");
for (const route of ["src/app/api/admin/ratings/route.ts", "src/app/api/admin/ratings/[id]/route.ts", "src/app/api/admin/full-text/route.ts"]) {
  assert(read(route).includes("getCurrentAdmin()"), `${route} asks who is signed in`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
