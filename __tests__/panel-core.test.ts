import { addFrac, composite, frac, panelResult, parseThreshold, toDecimal } from "../src/lib/panel/aggregate";
import { buildPrompt } from "../src/lib/panel/prompt";
import { evidenceFound, normalise, parseRating } from "../src/lib/panel/parser";
import { COMPONENTS, FORMAT_NAME, TOTAL_WEIGHT, isReferenceModel, validScore } from "../src/lib/panel/rubric";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

const all = (n: number) => ({ k1: n, k2: n, k3: n, k4: n, k5: n, k6: n });

console.log("\nThe rubric");
assert(COMPONENTS.length === 6 && TOTAL_WEIGHT === 100, "six components, weights adding to 100");
assert(COMPONENTS.map((c) => c.weight).join("/") === "20/25/20/15/15/5", "weights are 20/25/20/15/15/5");
assert(COMPONENTS.map((c) => c.code).join(",") === "K1,K2,K3,K4,K5,K6", "the components are numbered K1 to K6");
assert(COMPONENTS.every((c) => c.optional === false), "every component is required (no N/A)");

console.log("\nThe arithmetic");
assert(toDecimal(composite(all(8))) === "8.000", "all components 8.0 give 8.000");
assert(toDecimal(composite({ k1: 8, k2: 7.5, k3: 8.5, k4: 7, k5: 8, k6: 7.5 })) === "7.800", "ChatGPT's worked example (8, 7.5, 8.5, 7, 8, 7.5) gives 7.800");
assert(toDecimal(composite({ k1: 8.5, k2: 8.5, k3: 8, k4: 7, k5: 8, k6: 7.5 })) === "8.050" && toDecimal(composite({ k1: 8.5, k2: 8.5, k3: 8, k4: 7, k5: 8, k6: 7.5 })) !== "7.975", "set A gives 8.050");
assert(toDecimal(composite({ ...all(8), k6: 8.5 })) === "8.025", "only K6 (weight 5) at 8.5 gives 8.025");
assert(throws(() => composite({ ...all(8), k1: null })), "no component can be N/A");
assert(throws(() => composite({ k1: 8, k2: 8, k3: 8, k4: 8, k5: 8 } as never)), "a missing component is refused");
assert(throws(() => composite({ ...all(8), k5: 8.3 })) && throws(() => composite({ ...all(8), k5: 0.5 })) && throws(() => composite({ ...all(8), k5: 10.5 })), "scores off the 0.5 grid or outside 1..10 are refused");
assert(validScore(1) && validScore(9.5) && validScore(10) && !validScore(NaN) && !validScore(7.25), "validScore");

console.log("\nThe rule: mean STRICTLY above 8");
const r = (...c: number[]) => panelResult(c.map((n) => frac(BigInt(Math.round(n * 1000)), BigInt(1000))));
assert(r().meetsThreshold === null && r().count === 0, "no rating: nothing to say");
assert(r(8.2).meetsThreshold === true, "a single rating of 8.2 qualifies");
assert(r(8).meetsThreshold === false && r(8, 8, 8).meetsThreshold === false, "exactly 8.000 does not qualify");
assert(panelResult([composite({ ...all(8), k6: 8.5 })]).meetsThreshold === true, "8.025 qualifies (and shows as 8.025, not 8.0)");
assert(r(8.2, 8.1, 8).meanText === "8.100" && r(8.2, 8.1, 8).meetsThreshold === true, "8.2, 8.1, 8.0 average 8.100");
assert(r(10, 10, 5).meanText === "8.333" && r(10, 10, 5).meetsThreshold === true, "10, 10, 5 average 8.333 and qualify: no disagreement gate");
assert(r(7.5, 8.5).meetsThreshold === false, "7.5 and 8.5 average exactly 8 and do not qualify");
const tiny = addFrac(frac(BigInt(8), BigInt(1)), frac(BigInt(1), BigInt(10000000)));
assert(panelResult([tiny]).meetsThreshold === true && panelResult([tiny]).meanText === "8.000", "8.0000001 qualifies although it displays as 8.000 (display never decides)");

console.log("\nSettings: threshold and official reviewer");
{
  const t = (x: string) => parseThreshold(x);
  assert(t("8") !== null && t("8.0") !== null && t("7.75") !== null && t("7,5") !== null, "a threshold such as 8, 8.0, 7.75 or 7,5 is accepted");
  assert(t("0") === null && t("11") === null && t("abc") === null && t("8.1234") === null && t("") === null && t("-8") === null, "0, 11, text, four decimals, empty and negative are refused");
  const seven75 = parseThreshold("7.75")!;
  assert(panelResult([frac(BigInt(7800), BigInt(1000))], seven75).meetsThreshold === true && panelResult([frac(BigInt(7750), BigInt(1000))], seven75).meetsThreshold === false, "with a threshold of 7.75, 7.800 qualifies and 7.750 does not");
  assert(panelResult([frac(BigInt(8100), BigInt(1000))], parseThreshold("8")!).meetsThreshold === true && panelResult([frac(BigInt(8000), BigInt(1000))], parseThreshold("8.0")!).meetsThreshold === false, "8 and 8.0 are the same threshold");
  assert(isReferenceModel("GPT-6") && isReferenceModel("ChatGPT") && isReferenceModel("OpenAI o3") && !isReferenceModel("Grok 4.5") && !isReferenceModel("Gemini 2.5 Flash"), "by default ChatGPT models are the reference and others are not");
  assert(isReferenceModel("Grok 4.5", ["grok"]) && !isReferenceModel("GPT-6", ["grok"]) && !isReferenceModel("GPT-6", [""]), "the keywords decide, and an empty keyword matches nothing");
}

console.log("\nThe parser (JALIN_PANEL_V2)");
const FILLER = "Hari berlalu dengan perlahan dan tiada apa yang berubah di kampung itu. ".repeat(20);
const TEXT = "Hujan turun sejak pagi di tepi Sungai Kelantan. Mak menjemur kain di serambi walaupun langit kelabu. " + FILLER + "Aku tahu dia sedang menunggu seseorang yang tidak akan pulang.";
const code = "PNL-ABCD2345";
const REASON = "Imej yang tepat dan tenang, dan ia menyokong suasana keseluruhan karya.";
function rows(overrides: Record<string, string | null> = {}): Record<string, string | null> {
  const base: Record<string, string | null> = {
    FORMAT: FORMAT_NAME, KOD: code, MODEL: "Model Ujian 1", VERDIK: "Sebuah cerpen tenang yang berkesan melalui perincian kecil.",
    BUKTI_AWAL: '"Hujan turun sejak pagi di tepi Sungai Kelantan"', BUKTI_AKHIR: '"seseorang yang tidak akan pulang."',
  };
  const quotes = ['"Hujan turun sejak pagi"', '"Aku tahu dia sedang menunggu"', '"seseorang yang tidak akan pulang"', '"Mak menjemur kain di serambi"', '"di tepi Sungai Kelantan"', '"walaupun langit kelabu"'];
  const scores = ["8.5", "8", "8.5", "9", "8", "7.5"];
  COMPONENTS.forEach((c, i) => { base[`${c.code}_SKOR`] = scores[i]!; base[`${c.code}_BUKTI`] = quotes[i]!; base[`${c.code}_SEBAB`] = REASON; });
  base.TAMAT = FORMAT_NAME;
  return { ...base, ...overrides };
}
const text = (o: Record<string, string | null> = {}, extra = "") => Object.entries(rows(o)).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join("\n") + extra;
const parse = (t: string) => parseRating(t, { code, snapshotText: TEXT });
const good = parse(text());
assert(good.ok && good.rating.components.length === 6 && good.rating.warnings.length === 0, "a correct answer is accepted without warnings", good);
assert(good.ok && good.rating.verdict.startsWith("Sebuah cerpen") && good.rating.modelClaimed === "Model Ujian 1", "the verdict and the model name are read from the answer");
const comp = good.ok ? toDecimal(composite(Object.fromEntries(good.rating.components.map((c) => [c.key, c.score])))) : "";
assert(comp === "8.325", "its composite is computed by the system (8.325)", comp);

const bad = (o: Record<string, string | null>, needle: RegExp, msg: string) => { const p = parse(text(o)); assert(!p.ok && p.errors.some((e) => needle.test(e)), msg, p); };
bad({ KOD: "PNL-XXXXXXXX" }, /KOD tidak sepadan/, "a wrong code is refused (an answer for another piece)");
bad({ K1_SKOR: null }, /K1_SKOR hilang/, "a missing score is refused");
bad({ K3_BUKTI: null }, /K3_BUKTI hilang/, "a missing evidence line is refused");
bad({ K4_SEBAB: null }, /K4_SEBAB hilang/, "a missing reason is refused");
bad({ K2_SEBAB: "Baik." }, /terlalu ringkas/, "an empty reason such as 'Baik.' is refused");
bad({ K1_SKOR: "8.3" }, /tidak sah/, "a score off the grid is refused");
bad({ K1_SKOR: "11" }, /tidak sah/, "a score above 10 is refused");
bad({ K5_SKOR: "N/A" }, /tidak sah/, "N/A is refused: all six components apply");
bad({ K1_SKOR: "NaN" }, /tidak sah/, "NaN is not a score");
bad({ K1_SKOR: "8.0001" }, /tidak sah/, "8.0001 is not on the 0.5 grid");
bad({ K1_SKOR: "1e1" }, /tidak sah/, "exponent notation is not a score");
bad({ K1_SKOR: "Infinity" }, /tidak sah/, "Infinity is not a score");
bad({ K1_SKOR: "８" }, /tidak sah/, "a full-width digit is not a score");
bad({ VERDIK: null }, /VERDIK/, "a missing verdict is refused");
bad({ MODEL: null }, /MODEL/, "a missing model line is refused");
{ const p = parse(text().replace(`TAMAT: ${FORMAT_NAME}`, `SKOR_AKHIR: 10
TAMAT: ${FORMAT_NAME}`)); assert(!p.ok && p.errors.some((e) => /tidak dikenali/.test(e)), "an unknown label (a made-up total) is refused", p); }
bad({ BUKTI_AKHIR: '"Mak menjemur kain di serambi walaupun"' }, /BUKTI_AKHIR tidak sepadan/, "a closing line that is not the end of the text is refused (a cut-off text)");
bad({ BUKTI_AWAL: '"Aku tahu dia sedang menunggu seseorang"' }, /BUKTI_AWAL tidak sepadan/, "an opening line that is not the start of the text is refused");
bad({ BUKTI_AKHIR: null }, /BUKTI_AKHIR/, "a missing closing line is refused");
{
  const withNotes = TEXT + " Nota. " + "Sumber rujukan dan catatan kaki ditulis di sini untuk tujuan ujian sahaja. ".repeat(5);
  const ok = parseRating(text(), { code, snapshotText: withNotes });
  assert(ok.ok, "a work that closes with notes after the story still passes when the reviewer quotes the end of the story (it is within the last 30%)", ok);
  const farBefore = parseRating(text({ BUKTI_AKHIR: '"Kalimat unik di permulaan cerita yang tidak diulang di tempat lain."' }), { code, snapshotText: "Kalimat unik di permulaan cerita yang tidak diulang di tempat lain. " + FILLER.repeat(3) + TEXT.slice(-120) });
  assert(farBefore.ok === false && farBefore.errors.some((e) => /BUKTI_AKHIR/.test(e)), "a closing quote from the first part of a long text is still refused");
}
assert(!parse(text({}, "\n" + text())).ok, "two blocks are refused");
assert(!parse("tiada blok di sini").ok, "no block is refused");
const dup = parse(text().replace(`TAMAT: ${FORMAT_NAME}`, `K1_SKOR: 10\nTAMAT: ${FORMAT_NAME}`));
assert(!dup.ok && dup.errors.some((e) => /berulang/.test(e)), "a repeated label is refused");

console.log("\nTolerance for what a chat window does to text");
const chatty = text().split("\n").map((l, i) => (i > 1 && i < 12 ? `- **${l.split(":")[0]}**:${l.slice(l.indexOf(":") + 1)}` : l)).join("\n");
assert(parse("Berikut penilaian saya:\n\n" + chatty + "\n\nSemoga membantu.").ok, "bullets, bold marks and chatter outside the block are tolerated");
const outside = parse("Berikut:\n" + text());
assert(outside.ok && outside.rating.warnings.some((w) => /luar blok/.test(w)), "text outside the block is reported as a warning");
const wrapped = parse(text({ VERDIK: "Sebuah cerpen tenang\nyang berkesan melalui\nperincian kecil." }));
assert(wrapped.ok && wrapped.rating.verdict === "Sebuah cerpen tenang yang berkesan melalui perincian kecil.", "a wrapped value continues the previous field");
const long = parse(text({ VERDIK: "x".repeat(300) }));
assert(long.ok && long.rating.warnings.some((w) => /VERDIK melebihi/.test(w)), "a verdict over the length limit is kept but flagged");

console.log("\nEvidence");
const norm = normalise(TEXT);
assert(evidenceFound("“Mak  menjemur kain di serambi”", norm), "curly quotes and spacing do not matter");
assert(evidenceFound("Hujan turun sejak pagi ... Mak menjemur kain", norm), "an ellipsis joins two passages in order");
assert(!evidenceFound("Mak menjemur kain ... Hujan turun sejak pagi", norm), "passages out of order are not found");
assert(!evidenceFound("Dia menangis sepanjang malam", norm), "an invented quote is not found");
assert(!evidenceFound("aku", norm), "a quote too short to mean anything is not accepted");
const fake = parse(text({ K4_BUKTI: '"Dia menangis sepanjang malam"' }));
assert(fake.ok && fake.rating.warnings.some((w) => /K4/.test(w)) && fake.rating.components.find((c) => c.code === "K4")?.evidenceOk === false, "a fabricated quote is flagged on that component, not silently accepted");

console.log("\nThe prompt");
const prompt = buildPrompt({ code, title: "Ujian", workType: "cerpen", coverage: "keseluruhan teks (1 bahagian)", text: TEXT });
assert(prompt.includes(`KOD: ${code}`) && prompt.includes(`FORMAT: ${FORMAT_NAME}`) && prompt.includes(`TAMAT: ${FORMAT_NAME}`), "it carries the code and the fixed answer format");
assert(COMPONENTS.every((c) => prompt.includes(`${c.code}_SKOR`) && prompt.includes(`${c.code}_BUKTI`) && prompt.includes(`${c.code}_SEBAB`) && prompt.includes(c.title.toUpperCase())), "it lists all six components with their three fields each");
assert(prompt.includes("DATA untuk dinilai") && prompt.indexOf("MULA TEKS KARYA") > prompt.indexOf("FORMAT JAWAPAN"), "it tells the reviewer the text is data, and puts the text after the instructions");
assert(prompt.includes("jangan guna skor atau pandangan penilai lain") && prompt.includes("sistem yang mengiranya"), "it forbids other reviewers' scores and tells the reviewer not to compute the total");
assert(prompt.includes("tiada N/A") && prompt.includes("Hormati bentuk lirik"), "it forbids N/A and states fairness to unconventional forms");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
