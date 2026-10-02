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

export function buildGlossaryPrompt(input: { type: string; body: string; existingTerms: string[] }): string {
  const existing = input.existingTerms.length
    ? `\nIstilah yang SUDAH ada (jangan ulang): ${input.existingTerms.join(", ")}.\n`
    : "";
  return `Anda pembantu editorial Jalin (platform bacaan sastera berilustrasi untuk remaja 13–17 tahun). Tugas anda: cadangkan glosari untuk karya ${input.type} di bawah.

PERATURAN
- Pilih 6 hingga 12 perkataan atau frasa yang mungkin sukar bagi pembaca remaja: istilah teknikal, kata Melayu tinggi atau kurang lazim, pinjaman asing, atau istilah kerja.
- Setiap istilah MESTI wujud dalam manuskrip, dieja tepat seperti dalam teks. Jangan reka istilah.
- Jangan masukkan nama watak atau nama tempat.
- Maksud dalam Bahasa Melayu, satu atau dua ayat pendek, berdasarkan konteks dalam teks. Jangan reka fakta.
- Jika tidak pasti, tulis "perlu semakan editor" pada Maksud.
${existing}
FORMAT JAWAPAN (ikut tepat; tiada pengenalan, tiada penutup, tiada nombor, tiada tanda markdown)
[GLOSARI]
Istilah: (perkataan seperti dieja dalam teks)
Maksud: (maksud ringkas)
____
Istilah: ...
Maksud: ...

CONTOH
[GLOSARI]
Istilah: zink
Maksud: Kepingan logam nipis yang menjadi bumbung bengkel.
____
Istilah: fan belt
Maksud: Tali getah dalam enjin yang menggerakkan beberapa bahagian kereta.

MANUSKRIP
${input.body.trim() || "[Manuskrip belum diisi. Tampal manuskrip di sini sebelum menghantar kepada chatbot.]"}`;
}

function clean(value: string): string {
  return value
    .replace(/^[\s>*•\-–—·]+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TERM_KEY = /^(?:[*_\-•>\s]*)(istilah|term|perkataan|kata)\s*[:：]\s*(.*)$/i;
const MEANING_KEY = /^(?:[*_\-•>\s]*)(maksud|makna|meaning|definisi|takrif|erti)\s*[:：]\s*(.*)$/i;

function fold(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase("ms-MY").replace(/\s+/g, " ").trim();
}

export function parseGlossaryPaste(answer: string, body: string, existingTerms: string[]): GlossaryPasteResult {
  const text = answer
    .replace(/\r\n/g, "\n")
    .replace(/^```[a-z]*\s*$/gim, "")
    .replace(/^\s*\[?GLOSARI\]?\s*:?\s*$/gim, "");

  const pairs: GlossaryPasteItem[] = [];
  let unreadable = 0;

  // 1) labelled blocks: "Istilah: x" then "Maksud: y"
  let term: string | null = null;
  let meaning: string[] = [];
  let inMeaning = false;
  let labelled = false;
  const flush = () => {
    if (term === null && meaning.length === 0) return;
    const m = meaning.join(" ").trim();
    if (term && m) pairs.push({ term, meaning: m });
    else unreadable += 1;
    term = null;
    meaning = [];
    inMeaning = false;
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
      if (split && split[1] && split[2]) pairs.push({ term: clean(split[1]), meaning: clean(split[2]) });
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
    const termText = pair.term.slice(0, MAX_TERM);
    const meaningText = pair.meaning.slice(0, MAX_MEANING);
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
  return { items, existing, notInText, unreadable };
}
