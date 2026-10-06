/**
 * Glossary tab: the prompt the editor copies and the parser for what the chatbot answers.
 *
 * The answer uses the same labelled format as the rest of the authoring flow ([GLOSARI] with
 * Istilah/Maksud blocks split by ____), but the parser is forgiving because chatbots add bullets,
 * bold, numbering or write "istilah — maksud" on one line.
 */

export interface GlossaryPasteItem {
  term: string;
  meaning: string;
}

export interface GlossaryPasteResult {
  /** The chatbot said there are no difficult terms (a valid answer, not an error). */
  none: boolean;
  /** New terms to add. */
  items: GlossaryPasteItem[];
  /** Terms the work already has. */
  existing: string[];
  /** Terms that do not occur in the manuscript, so they would never be marked for the reader. */
  notInText: string[];
  /** Blocks that had a term but no meaning (or the reverse). */
  unreadable: number;
}

const MAX_TERM = 80;
const MAX_MEANING = 600;

/** Shared with the all-in-one fill prompt (work-fill.ts). */
export const GLOSSARY_RULES = `- UJIAN KESUKARAN: masukkan sesuatu perkataan atau frasa hanya jika seorang pelajar Tingkatan 2 yang biasa akan terhenti membaca kerana tidak tahu maknanya. Jika pelajar itu faham, JANGAN masukkan. Perkataan harian dan perkataan yang lazim didengar (cth. rumah, kereta, pintu, jam, sekolah) tidak perlu dimasukkan.
- Yang layak: istilah teknikal khusus, kata Melayu sastera atau kurang lazim, simpulan bahasa dan pepatah, pinjaman asing yang jarang, dan istilah kerja yang khusus. Semak juga kata sastera dalam dialog dan naratif.
- Jika ragu-ragu sama ada seorang remaja tahu perkataan itu, JANGAN masukkan. Lebih baik dua istilah yang benar-benar sukar daripada tujuh yang mudah. Elakkan perkataan biasa yang hanya berimbuhan (contoh: berjalan, berlari, menulis, kedai runcit) dan istilah umum yang digunakan setiap hari.
- Tiada had bilangan. Jangan cuba mencukupkan bilangan. Jika tiada perkataan yang sukar, jawab hanya dengan [GLOSARI] dan satu baris: Tiada istilah sukar.
- Setiap istilah MESTI wujud dalam manuskrip, dieja tepat seperti dalam teks. Jangan reka istilah.
- Jangan masukkan nama watak atau nama tempat.
- Maksud dalam Bahasa Melayu, satu atau dua ayat pendek, berdasarkan konteks dalam teks. Jangan reka fakta.
- Jika tidak pasti tentang maksud, tulis "perlu semakan editor" pada Maksud.
- PERKATAAN ASING: pada baris Asing, senaraikan SEMUA perkataan atau frasa yang bukan Bahasa Melayu (Inggeris, Arab, dan lain-lain, termasuk istilah teknikal Inggeris) yang terdapat dalam Istilah atau Maksud anda, dipisahkan koma, ditulis tepat seperti dalam Istilah/Maksud. Jika tiada, tulis: Asing: tiada. Sistem akan mencondongkannya; jangan guna asterisk atau tanda markdown lain (tiada tebal, tiada tanda petikan).
- SEMAKAN AKHIR sebelum menjawab: (1) buang setiap istilah yang pelajar Tingkatan 2 sudah faham; (2) pastikan baris Asing menyenaraikan setiap perkataan asing; (3) pastikan setiap istilah ada dalam manuskrip.
`;

export const GLOSSARY_FORMAT = `FORMAT JAWAPAN (ikut tepat; tiada pengenalan, tiada penutup, tiada nombor, tiada tanda markdown)
[GLOSARI]
Istilah: (perkataan seperti dieja dalam teks)
Maksud: (maksud ringkas)
Asing: (perkataan asing, atau tiada)
____
Istilah: ...
Maksud: ...
Asing: ...

CONTOH (hanya untuk format; jangan salin istilahnya)
[GLOSARI]
Istilah: gundah-gulana
Maksud: Berasa bimbang dan resah yang berpanjangan.
Asing: tiada
____
Istilah: pit stop
Maksud: Perhentian singkat untuk membaiki atau mengisi minyak kereta, juga digunakan dalam motorsport.
Asing: pit stop, motorsport

`;

export function buildGlossaryPrompt(input: { type: string; body: string; existingTerms: string[] }): string {
  const existing = input.existingTerms.length
    ? `\nIstilah yang SUDAH ada (jangan ulang): ${input.existingTerms.map((t) => t.replace(/\*/g, "")).join(", ")}.\n`
    : "";
  return `Anda pembantu editorial Jalin (platform bacaan sastera berilustrasi untuk remaja 13–17 tahun). Tugas anda: cadangkan glosari untuk karya ${input.type} di bawah.

PERATURAN
${GLOSSARY_RULES}${existing}
${GLOSSARY_FORMAT}MANUSKRIP
${input.body.trim() || "[Manuskrip belum diisi. Tampal manuskrip di sini sebelum menghantar kepada chatbot.]"}`;
}

function clean(value: string): string {
  return value
    .replace(/^(?:\s|[>•\-–—·]|\*(?=\s))+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TERM_KEY = /^(?:[*_\-•>\s]*)(istilah|term|perkataan|kata)\s*[:：]\s*(.*)$/i;
const FOREIGN_KEY = /^(?:[*_\-•>\s]*)(asing|perkataan asing|condong|italik)\s*[:：]\s*(.*)$/i;
const MEANING_KEY = /^(?:[*_\-•>\s]*)(maksud|makna|meaning|definisi|takrif|erti)\s*[:：]\s*(.*)$/i;

/** Italicise exactly the foreign words the chatbot listed; anything already marked or not listed is left alone. */
export function italicise(text: string, foreign: string[] | undefined): string {
  let out = text;
  for (const phrase of [...(foreign ?? [])].sort((a, b) => b.length - a.length)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}*])(${escaped})(?![\\p{L}\\p{N}*])`, "giu"), "*$1*");
  }
  return out;
}

function fold(value: string): string {
  return value.replace(/\*/g, "").normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase("ms-MY").replace(/\s+/g, " ").trim();
}

/** A meaning the chatbot did not know ("Tidak dinyatakan" is the word the Tambah Karya prompts teach it): not a meaning. */
const NO_MEANING = /^(tiada|tidak ada|tidak dinyatakan|tidak diketahui|n\/a|-|—|\.\.\.)\.?$/i;

export function parseGlossaryPaste(answer: string, body: string, existingTerms: string[]): GlossaryPasteResult {
  const text = answer
    .replace(/\r\n/g, "\n")
    .replace(/^```[a-z]*\s*$/gim, "")
    .replace(/^\s*\[?GLOSARI\]?\s*:?\s*$/gim, "");

  const pairs: (GlossaryPasteItem & { foreign?: string[] })[] = [];
  let unreadable = 0;

  // 1) labelled blocks: "Istilah: x" then "Maksud: y"
  let term: string | null = null;
  let meaning: string[] = [];
  let inMeaning = false;
  let labelled = false;
  let foreign: string[] = [];
  const flush = () => {
    if (term === null && meaning.length === 0) return;
    const m = meaning.join(" ").trim();
    if (term && m && !NO_MEANING.test(m)) pairs.push({ term, meaning: m, foreign });
    else unreadable += 1;
    term = null;
    meaning = [];
    inMeaning = false;
    foreign = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[_\-=*]{3,}$/.test(line)) {
      flush();
      continue;
    }
    const t = TERM_KEY.exec(line);
    if (t) {
      labelled = true;
      if (term !== null || meaning.length > 0) flush();
      term = clean(t[2] ?? "");
      continue;
    }
    const fr = FOREIGN_KEY.exec(line);
    if (fr) {
      labelled = true;
      inMeaning = false;
      foreign = (fr[2] ?? "").split(/[,;，]/).map((p) => clean(p)).filter((p) => p && !/^(tiada|tidak ada|-|—|n\/a)$/i.test(p));
      continue;
    }
    const m = MEANING_KEY.exec(line);
    if (m) {
      labelled = true;
      meaning.push(clean(m[2] ?? ""));
      inMeaning = true;
      continue;
    }
    // a wrapped meaning continues on the next line
    if (labelled && inMeaning && term !== null) meaning.push(clean(line));
  }
  flush();

  // 2) one line per term: "istilah — maksud", "istilah: maksud", "istilah - maksud"
  if (!labelled) {
    unreadable = 0;
    for (const raw of text.split("\n")) {
      const line = clean(raw.trim());
      if (!line) continue;
      const split = /^(.{1,80}?)\s*(?:—|–|:|：|=|\s-\s)\s+(.+)$/.exec(line) ?? /^(.{1,80}?)\s*[:：=]\s*(.+)$/.exec(line);
      if (split && split[1] && split[2] && !NO_MEANING.test(clean(split[2]))) pairs.push({ term: clean(split[1]), meaning: clean(split[2]) });
      else unreadable += 1;
    }
  }

  const have = new Set(existingTerms.map(fold));
  const seen = new Set<string>();
  const haystack = fold(body);
  const items: GlossaryPasteItem[] = [];
  const existing: string[] = [];
  const notInText: string[] = [];
  for (const pair of pairs) {
    const termText = italicise(pair.term.slice(0, MAX_TERM), pair.foreign);
    const meaningText = italicise(pair.meaning.slice(0, MAX_MEANING), pair.foreign);
    const key = fold(termText);
    if (!key || !meaningText) {
      unreadable += 1;
      continue;
    }
    if (have.has(key)) {
      existing.push(termText);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    if (haystack && !haystack.includes(key)) {
      notInText.push(termText);
      continue;
    }
    items.push({ term: termText, meaning: meaningText });
  }
  const none = pairs.length === 0 && /^[\s*_>\-•]*tiada\s+istilah[^\n:]{0,20}[.!]?\s*$/im.test(answer);
  return { none, items, existing, notInText, unreadable: none ? 0 : unreadable };
}
