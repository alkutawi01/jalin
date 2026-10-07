/**
 * The instruction an editor copies into a chatbot to have a work rated. The same words for every chatbot, so that their
 * answers can be set side by side; the answer comes back in one fenced block that parse.ts reads.
 */
import { COMPONENTS, REVIEW_MAX_WORDS, REVIEW_MIN_WORDS, RUBRIC_VERSION, VERDICT_MAX_WORDS, rubricText } from "./rubric";

export const BLOCK_OPEN = "[PENILAIAN_JALIN]";
export const BLOCK_CLOSE = "[/PENILAIAN_JALIN]";

export interface RatingPromptInput {
  /** "cerpen", "novela" or "bersiri". */
  type: string;
  title: string;
  code: string;
  /** The whole text; left out when the editor attaches the downloaded file instead. */
  text?: string;
}

const TYPE_WORD: Record<string, string> = { cerpen: "cerpen", novela: "novela", bersiri: "siri (semua episod)" };

/** The block exactly as the chatbot must write it. */
export function outputTemplate(code: string): string {
  const parts = COMPONENTS.map((c) => `${c.label} — Skor: (0-10)\nSebab: (satu ayat, khusus kepada teks ini)\nBukti: "(satu petikan pendek, disalin tepat dari teks)"`).join("\n\n");
  return `${BLOCK_OPEN}
Kod Rujukan: ${code}
Penilai: (nama model anda, contohnya ChatGPT, Claude, Gemini)

${parts}

Sesuai Untuk: (golongan pembaca yang paling sesuai, satu baris)
Verdict: (satu ayat, tidak lebih ${VERDICT_MAX_WORDS} patah perkataan)
Ulasan: (${REVIEW_MIN_WORDS}-${REVIEW_MAX_WORDS} patah perkataan, satu perenggan atau lebih)
Kekuatan 1: ...
Kekuatan 2: ...
Kekuatan 3: (atau "tidak dinyatakan")
Kelemahan 1: ...
Kelemahan 2: (atau "tidak dinyatakan")
Kelemahan 3: (atau "tidak dinyatakan")
Amaran Kandungan: (atau "tiada")
${BLOCK_CLOSE}`;
}

export function buildRatingPrompt(input: RatingPromptInput): string {
  const what = TYPE_WORD[input.type] ?? "karya";
  const source = input.text
    ? `TEKS PENUH (${what}: "${input.title}")\n<<<TEKS\n${input.text.trim()}\nTEKS>>>`
    : `TEKS PENUH ada dalam fail yang dilampirkan (${what}: "${input.title}"). Baca seluruh fail itu. Jika fail tidak dilampirkan atau tidak dapat dibaca sepenuhnya, JANGAN menilai: jawab hanya "TEKS TIDAK LENGKAP".`;

  return `Anda penilai sastera yang bebas. Nilai ${what} berbahasa Melayu di bawah untuk Jalin, sebuah platform bacaan sastera. Penilaian anda akan disiarkan atas nama model anda, jadi ia mesti jujur dan boleh dipertahankan.

PRINSIP
- Nilai teks yang diberi sahaja. Jangan menaikkan skor kerana karya ini milik Jalin, kerana siapa penulisnya, atau kerana gayanya kelihatan kemas.
- Jangan menilai sama ada mesej cerita "baik" atau "bermoral"; nilai keberkesanan sasteranya.
- Jangan meneka atau melengkapkan bahagian yang tidak diberi.
- Baca SELURUH teks dahulu sebelum memberi sebarang skor.

SKALA (nombor bulat 0 hingga 10 bagi setiap komponen)
- 6 ialah aras lalai: karya berfungsi tanpa cacat besar tetapi tidak menonjol. Mula dari 6 dan naik atau turun hanya dengan sebab yang dapat ditunjukkan dalam teks.
- 8 bermaksud kuat secara konsisten; 9 dan 10 jarang dan memerlukan mutu luar biasa.
- Gunakan sauh bertulis 2, 4, 6, 8, 10 di bawah; nombor ganjil untuk karya di antara dua sauh. 0 hanya jika komponen itu langsung tiada.
- Nilai setiap komponen secara berasingan; jangan samakan semua skor.

RUBRIK (${RUBRIC_VERSION})
${rubricText()}

BAGI SETIAP KOMPONEN
- Sebab: satu ayat yang khusus kepada teks ini (bukan pujian umum).
- Bukti: satu petikan pendek (5 hingga 25 patah perkataan) yang DISALIN TEPAT dari teks, bukan parafrasa, tanpa elipsis di tengah. Gunakan petikan yang berbeza bagi setiap komponen.

VERDICT DAN ULASAN
- Verdict: satu ayat yang boleh dipetik untuk menarik pembaca, tidak lebih ${VERDICT_MAX_WORDS} patah perkataan, tanpa spoiler, tanpa menyebut skor, tanpa superlatif yang tidak disokong ulasan anda.
- Ulasan: ${REVIEW_MIN_WORDS} hingga ${REVIEW_MAX_WORDS} patah perkataan untuk pembaca umum: apa yang karya ini lakukan dengan baik, di mana ia kurang, dan kenapa ia wajar (atau tidak wajar) dibaca. Tanpa spoiler penamat. Bahasa Melayu baku.
- Sesuai Untuk: golongan pembaca yang paling sesuai menurut anda (umur, minat atau kematangan), satu baris.

${source}

FORMAT JAWAPAN
Jawab dengan SATU blok di bawah sahaja: tiada pengenalan, tiada penutup, tiada markdown, tiada tebal, tiada nombor di hadapan label. Kekalkan setiap label tepat seperti ditulis dan dalam urutan ini. Ulang Kod Rujukan tepat seperti diberi.

${outputTemplate(input.code)}`;
}
