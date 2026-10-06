/**
 * Reads a chatbot's rating, pasted by the editor, into a record.
 *
 * Forgiving about decoration (bold marks, bullets, code fences, "8/10", a dash or a colon after a label, text before or
 * after the block) and strict about substance: a missing part, a number that is not a whole 0-10, a verdict that is too long,
 * the wrong reference code, or quotes that are mostly not in the text turn the whole paste away, with the reason said.
 * Nothing is repaired silently, and the overall number is never taken from the chatbot.
 */
import { BLOCK_CLOSE, BLOCK_OPEN } from "./prompt";
import { COMPONENTS, REVIEW_MAX_WORDS, REVIEW_MIN_WORDS, SCORE_MAX, SCORE_MIN, VERDICT_MAX_WORDS, countWords, overallScore, type Scores } from "./rubric";

export interface ParsedEvidence {
  quote: string;
  /** Found in the text of the work (after quotes and spaces are evened out). */
  verified: boolean;
}

export interface ParsedRating {
  code: string;
  reviewer: string;
  scores: Scores;
  reasons: Record<string, string>;
  evidence: Record<string, ParsedEvidence>;
  overall: number;
  audience: string;
  verdict: string;
  review: string;
  strengths: string[];
  weaknesses: string[];
  contentWarnings: string;
}

export type ParseResult = { ok: true; rating: ParsedRating; warnings: string[] } | { ok: false; errors: string[] };

/** How many of the seven quotes may be missing from the text before the paste is turned away. */
export const UNVERIFIED_MAX = 3;
const REVIEW_HARD_MIN = 60;
const REVIEW_HARD_MAX = 450;
const REVIEWER_MAX = 40;

const EMPTY = /^(tidak dinyatakan|tiada|tidak ada|n\/a|none|-+|—|\.\.\.|…)\.?$/i;
const isEmpty = (value: string) => value.trim() === "" || EMPTY.test(value.trim());

function fold(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " dan ").replace(/[^a-z0-9]+/g, " ").trim();
}

/** A line without its Markdown dress: bullets, numbers, heading marks, bold and italic marks, back-ticks. */
function undress(line: string): string {
  return line
    .replace(/^\s*(?:[-*•>]+|\d+[.)])\s+/, "")
    .replace(/^\s*#+\s*/, "")
    .replace(/\*\*|__|`/g, "")
    .trim();
}

const REVIEWERS: Array<[RegExp, string]> = [
  [/chat\s*gpt|\bgpt\b|openai/i, "ChatGPT"],
  [/claude|anthropic/i, "Claude"],
  [/gemini|bard/i, "Gemini"],
  [/grok/i, "Grok"],
  [/mimo/i, "Mimo"],
  [/deepseek/i, "DeepSeek"],
  [/copilot/i, "Copilot"],
  [/llama|meta ai/i, "Meta AI"],
  [/mistral|le chat/i, "Mistral"],
  [/qwen/i, "Qwen"]
];

/** "ChatGPT (GPT-5)" and "chatgpt" are one rater; an unknown name is kept as written. */
export function canonicalReviewer(raw: string): string {
  const value = raw.replace(/[*_`"“”]/g, "").trim();
  for (const [pattern, name] of REVIEWERS) if (pattern.test(value)) return name;
  return value.slice(0, REVIEWER_MAX);
}

/** Evened out for comparing a quote with the text: one kind of quote mark and dash, no emphasis marks, single spaces. */
export function normaliseForMatch(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[*_]/g, "")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** The quote as the chatbot meant it: without the marks around it and without a full stop or an ellipsis at its ends. */
function bareQuote(value: string): string {
  return value
    .trim()
    .replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "")
    .replace(/^(?:\.\.\.|…)\s*|\s*(?:\.\.\.|…)$/g, "")
    .trim();
}

export function quoteIsInText(quote: string, normalisedText: string): boolean {
  const q = normaliseForMatch(bareQuote(quote)).replace(/^["']+|["'.,;:!?]+$/g, "").trim();
  if (q.length < 8) return false; // too short to prove anything
  return normalisedText.includes(q);
}

type Field = { key: string; value: string };

const SIMPLE_LABELS: Array<[string, string]> = [
  ["kod rujukan", "code"],
  ["penilai", "reviewer"],
  ["sesuai untuk", "audience"],
  ["verdict", "verdict"],
  ["verdik", "verdict"],
  ["ulasan", "review"],
  ["amaran kandungan", "warnings"],
  ["sebab", "reason"],
  ["bukti", "evidence"]
];

/** What a line starts: a component with its score, a plain label, a numbered strength or weakness, or nothing (a continuation). */
function startOf(line: string): { key: string; value: string } | null {
  const text = undress(line);
  if (!text) return null;

  for (const component of COMPONENTS) {
    const name = fold(component.label);
    const head = text.match(/^(.{3,40}?)\s*(?:[—–:|-]\s*)?skor\s*[:=]?\s*(.*)$/i);
    if (head && fold(head[1]) === name) return { key: `score:${component.key}`, value: head[2].trim() };
  }

  const numbered = text.match(/^(kekuatan|kelemahan)\s*(\d)\s*[:—–-]\s*(.*)$/i);
  if (numbered) return { key: `${numbered[1].toLowerCase()}:${numbered[2]}`, value: numbered[3].trim() };

  const plain = text.match(/^([A-Za-z ]{3,24}?)\s*:\s*(.*)$/);
  if (plain) {
    const label = fold(plain[1]);
    const found = SIMPLE_LABELS.find(([name]) => name === label);
    if (found) return { key: found[1], value: plain[2].trim() };
  }
  return null;
}

function blockOf(raw: string): { block: string } | { error: string } {
  const text = raw.replace(/\r\n/g, "\n").replace(/\\\[/g, "[").replace(/\\\]/g, "]").replace(/\\_/g, "_");
  const open = /\[\s*PENILAIAN[_ ]JALIN\s*\]/gi;
  const starts = [...text.matchAll(open)];
  if (starts.length === 0) return { error: `Blok ${BLOCK_OPEN} tidak ditemui. Tampal jawapan chatbot sepenuhnya.` };
  if (starts.length > 1) return { error: `Ada lebih daripada satu blok ${BLOCK_OPEN}. Tampal satu penilaian sahaja.` };
  const from = starts[0].index! + starts[0][0].length;
  const close = text.slice(from).search(/\[\s*\/\s*PENILAIAN[_ ]JALIN\s*\]/i);
  if (close < 0) return { error: `Penutup ${BLOCK_CLOSE} tidak ditemui: jawapan mungkin terpotong. Minta chatbot menulis semula.` };
  return { block: text.slice(from, from + close) };
}

export interface ParseOptions {
  /** The code of the work's text as it is now. */
  expectedCode: string;
  /** The whole text of the work, to look the quotes up in. */
  text: string;
}

export function parseRatingPaste(raw: string, options: ParseOptions): ParseResult {
  if (typeof raw !== "string" || raw.trim() === "") return { ok: false, errors: ["Tiada apa-apa ditampal."] };
  if (/TEKS TIDAK LENGKAP/i.test(raw) && !/PENILAIAN[_ ]JALIN/i.test(raw)) {
    return { ok: false, errors: ["Chatbot menyatakan teks tidak lengkap. Lampirkan fail teks penuh dan cuba semula."] };
  }
  const found = blockOf(raw);
  if ("error" in found) return { ok: false, errors: [found.error] };

  // Lines into fields; a line that starts nothing continues the field before it.
  const fields: Field[] = [];
  for (const line of found.block.split("\n")) {
    if (/^\s*```/.test(line)) continue;
    const start = startOf(line);
    if (start) fields.push(start);
    else if (fields.length > 0 && undress(line)) fields[fields.length - 1].value = `${fields[fields.length - 1].value}\n${undress(line)}`.trim();
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const once = (key: string, name: string): string => {
    const all = fields.filter((f) => f.key === key);
    if (all.length > 1) errors.push(`"${name}" ditulis lebih daripada sekali.`);
    return (all[0]?.value ?? "").trim();
  };

  const code = once("code", "Kod Rujukan").replace(/[*_`"\s]/g, "").toUpperCase();
  if (!code) errors.push('"Kod Rujukan" tiada.');
  else if (code !== options.expectedCode.toUpperCase()) {
    errors.push(`Kod Rujukan (${code}) bukan kod teks karya ini sekarang (${options.expectedCode}). Sama ada jawapan ini untuk karya lain, atau teks karya sudah berubah sejak arahan disalin. Salin arahan semula dan nilai semula.`);
  }

  const reviewerRaw = once("reviewer", "Penilai");
  const reviewer = isEmpty(reviewerRaw) || /nama model anda/i.test(reviewerRaw) ? "" : canonicalReviewer(reviewerRaw);
  if (!reviewer) errors.push('"Penilai" tiada: chatbot mesti menulis nama modelnya.');

  // The seven components, each followed by its own reason and quote.
  const scores: Scores = {};
  const reasons: Record<string, string> = {};
  const evidence: Record<string, ParsedEvidence> = {};
  const normalisedText = normaliseForMatch(options.text);
  for (const component of COMPONENTS) {
    const index = fields.findIndex((f) => f.key === `score:${component.key}`);
    if (index < 0) {
      errors.push(`Komponen "${component.label}" tiada.`);
      continue;
    }
    if (fields.filter((f) => f.key === `score:${component.key}`).length > 1) errors.push(`Komponen "${component.label}" ditulis lebih daripada sekali.`);
    const number = fields[index].value.replace(/\s*\/\s*10\b/, "").replace(/,/g, ".").trim().match(/^(\d+(?:\.\d+)?)\b/);
    const value = number ? Number(number[1]) : NaN;
    if (!number || !Number.isInteger(value) || value < SCORE_MIN || value > SCORE_MAX) {
      errors.push(`Skor "${component.label}" mesti nombor bulat ${SCORE_MIN} hingga ${SCORE_MAX} (ditulis: "${fields[index].value.slice(0, 30)}").`);
    } else scores[component.key] = value;

    // Its reason and quote are the "Sebab" and "Bukti" before the next component.
    let reason = "";
    let quote = "";
    for (let i = index + 1; i < fields.length && !fields[i].key.startsWith("score:"); i++) {
      if (fields[i].key === "reason" && !reason) reason = fields[i].value.trim();
      if (fields[i].key === "evidence" && !quote) quote = fields[i].value.trim();
    }
    if (isEmpty(reason)) errors.push(`"Sebab" bagi "${component.label}" tiada.`);
    else reasons[component.key] = reason.replace(/\n+/g, " ");
    if (isEmpty(quote)) errors.push(`"Bukti" bagi "${component.label}" tiada.`);
    else {
      const bare = bareQuote(quote.replace(/\n+/g, " "));
      evidence[component.key] = { quote: bare, verified: quoteIsInText(bare, normalisedText) };
    }
  }

  const unverified = COMPONENTS.filter((c) => evidence[c.key] && !evidence[c.key].verified);
  if (unverified.length > UNVERIFIED_MAX) {
    errors.push(`${unverified.length} daripada ${COMPONENTS.length} petikan bukti tidak ditemui dalam teks karya (${unverified.map((c) => c.label).join(", ")}). Chatbot mungkin tidak membaca teks sebenar. Nilai semula.`);
  } else {
    for (const c of unverified) warnings.push(`Bukti "${c.label}" tidak ditemui dalam teks (mungkin diparafrasa): "${evidence[c.key].quote.slice(0, 80)}"`);
  }

  const audience = once("audience", "Sesuai Untuk").replace(/\n+/g, " ");
  if (isEmpty(audience)) errors.push('"Sesuai Untuk" tiada.');

  const verdict = once("verdict", "Verdict").replace(/\n+/g, " ").replace(/^["“”']+|["“”']+$/g, "").trim();
  if (isEmpty(verdict)) errors.push('"Verdict" tiada.');
  else if (countWords(verdict) > VERDICT_MAX_WORDS) errors.push(`Verdict ${countWords(verdict)} patah perkataan; had ialah ${VERDICT_MAX_WORDS}. Minta chatbot memendekkannya.`);

  const review = once("review", "Ulasan").replace(/\n{3,}/g, "\n\n");
  const reviewWords = countWords(review);
  if (isEmpty(review)) errors.push('"Ulasan" tiada.');
  else if (reviewWords < REVIEW_HARD_MIN) errors.push(`Ulasan terlalu pendek (${reviewWords} patah perkataan; sekurang-kurangnya ${REVIEW_MIN_WORDS}).`);
  else if (reviewWords > REVIEW_HARD_MAX) errors.push(`Ulasan terlalu panjang (${reviewWords} patah perkataan; paling banyak ${REVIEW_MAX_WORDS}).`);
  else if (reviewWords < REVIEW_MIN_WORDS || reviewWords > REVIEW_MAX_WORDS) warnings.push(`Ulasan ${reviewWords} patah perkataan (disasarkan ${REVIEW_MIN_WORDS}-${REVIEW_MAX_WORDS}).`);

  const list = (prefix: string) =>
    [1, 2, 3]
      .map((n) => (fields.find((f) => f.key === `${prefix}:${n}`)?.value ?? "").replace(/\n+/g, " ").trim())
      .filter((value) => !isEmpty(value));
  const strengths = list("kekuatan");
  const weaknesses = list("kelemahan");
  if (strengths.length === 0) errors.push("Sekurang-kurangnya satu Kekuatan diperlukan.");
  if (weaknesses.length === 0) errors.push("Sekurang-kurangnya satu Kelemahan diperlukan (penilaian tanpa kelemahan tidak diterima).");

  const warningsRaw = once("warnings", "Amaran Kandungan").replace(/\n+/g, " ");
  const contentWarnings = isEmpty(warningsRaw) ? "" : warningsRaw;

  if (errors.length > 0) return { ok: false, errors };

  const values = COMPONENTS.map((c) => scores[c.key]);
  if (new Set(values).size === 1) warnings.push(`Semua tujuh komponen mendapat skor yang sama (${values[0]}): chatbot mungkin tidak menilai setiap komponen secara berasingan.`);

  return {
    ok: true,
    warnings,
    rating: { code, reviewer, scores, reasons, evidence, overall: overallScore(scores), audience, verdict, review, strengths, weaknesses, contentWarnings }
  };
}
