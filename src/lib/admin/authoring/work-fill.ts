/**
 * One copy, one paste: a single prompt that asks a chatbot for everything it may suggest about an
 * existing work, and the parser for its answer.
 *
 * Principle: the chatbot only HELPS. It never fills credits, images, rights evidence or the manuscript,
 * and it never overwrites something the editor has already written.
 */
import { GLOSSARY_FORMAT, GLOSSARY_RULES } from "./glossary-paste";
import { isSourcedWork } from "../../content/source-origin";

export interface WorkFillPromptInput {
  type: string;
  body: string;
  /** Terms the work already has; the chatbot must not repeat them. */
  glossaryTerms: string[];
  /** Characters the work already has. */
  characterNames: string[];
  /** Chapter slugs (novela), so the chatbot can say where a character first appears. */
  chapterSlugs: string[];
  /** Cerpen/Novela only: "sumber" when the editor marked the work as taken from another source. */
  origin?: string;
}

export function buildWorkFillPrompt(input: WorkFillPromptInput): string {
  const derivative = input.type !== "terjemahan" ? isSourcedWork(input.type, { origin: input.origin }) : true;
  const novela = input.chapterSlugs.length > 0;
  const existingChars = input.characterNames.length
    ? `Watak yang SUDAH ada (jangan ulang): ${input.characterNames.join(", ")}.\n`
    : "";
  const existingTerms = input.glossaryTerms.length
    ? `Istilah yang SUDAH ada (jangan ulang): ${input.glossaryTerms.map((t) => t.replace(/\*/g, "")).join(", ")}.\n`
    : "";
  return `Anda pembantu editorial Jalin (platform bacaan sastera berilustrasi untuk remaja 13–17 tahun). Tugas anda: MEMBANTU editor mengisi maklumat karya ${input.type} di bawah. Editor yang memutuskan; anda hanya mencadangkan.

PRINSIP
- Jangan reka fakta, nama atau peristiwa. Jika tidak pasti, kosongkan baris itu atau tulis "perlu semakan editor".
- Jangan sentuh teks karya, kredit, imej atau hak. Hanya isi bahagian di bawah.
- Jawab dengan bahagian berformat di bawah sahaja: tiada pengenalan, tiada penutup, tiada nombor, tiada tanda markdown.

[MAKLUMAT]
Dek: (satu atau dua ayat yang menarik pembaca remaja tanpa membocorkan pengakhiran)
Genre: (satu genre dalam satu atau dua patah perkataan)

[WATAK]
${existingChars}Nama: (nama watak seperti dalam teks; hanya watak yang benar-benar hadir)
Peranan: (peranan ringkas, tanpa membocorkan cerita)${novela ? `\nMuncul: (slug bab tempat watak mula-mula muncul, salah satu daripada: ${input.chapterSlugs.join(", ")})` : ""}
____
Nama: ...
Peranan: ...${novela ? "\nMuncul: ..." : ""}
(Jika tiada watak yang jelas, tulis hanya: Tiada watak.)

[GLOSARI]
${existingTerms}Peraturan glosari:
${GLOSSARY_RULES}
Format glosari:
${GLOSSARY_FORMAT.replace(/^FORMAT JAWAPAN[^\n]*\n\[GLOSARI\]\n/, "").replace(/\nCONTOH[\s\S]*$/, "")}
${derivative ? `
[SUMBER]
Isi SEMUA yang anda tahu dengan yakin tentang naskhah sumber. Jika anda tidak tahu atau tidak pasti, TINGGALKAN baris itu kosong; jangan meneka tahun, penerbit atau ISBN. Editor akan menyemak setiap baris yang anda isi.
Tajuk asal: (tajuk karya asal)
Pengarang asal: (nama pengarang asal)
Bahasa asal: (bahasa karya asal)
Tahun terbit pertama: (tahun karya itu mula-mula diterbitkan, 4 digit)
Penerbit: (penerbit naskhah yang digunakan)
Tahun cetakan: (tahun cetakan naskhah yang digunakan, 4 digit; boleh berbeza daripada tahun terbit pertama)
Cetakan ke: (cetakan yang ke berapa, contoh: Cetakan ketiga)
Penyunting: (nama penyunting naskhah itu)
Penterjemah: (hanya jika naskhah itu terjemahan)
ISBN: (hanya jika anda pasti)
Lokasi petikan: (muka surat atau bab petikan ini dalam naskhah itu)
Asas teks: (edisi atau terjemahan yang menjadi asas)
` : ""}
MANUSKRIP
${input.body.trim() || "[Manuskrip belum diisi. Tampal manuskrip di sini sebelum menghantar kepada chatbot.]"}`;
}

export interface WorkFillResult {
  dek: string;
  genre: string;
  characters: { name: string; role: string; first: string }[];
  /** Raw [GLOSARI] section, handed to the glossary parser. */
  glossaryText: string;
  source: {
    title: string;
    author: string;
    language: string;
    basis: string;
    firstPublished: number | null;
    publisher: string;
    editionYear: number | null;
    printing: string;
    editor: string;
    translator: string;
    isbn: string;
    locator: string;
  } | null;
  /** Section names that were present in the answer. */
  sections: string[];
}

const SECTION = /^\s*\[(MAKLUMAT|WATAK|GLOSARI|SUMBER)\]\s*$/i;

function field(block: string[], names: RegExp): string {
  for (const line of block) {
    const m = new RegExp(`^[\\s*_\\-•>]*(?:${names.source})\\s*[:：]\\s*(.*)$`, "i").exec(line);
    if (m) return (m[1] ?? "").replace(/\*\*|__/g, "").trim().replace(/^["“”']+|["“”']+$/g, "");
  }
  return "";
}

const EMPTY = /^(tiada|tidak ada|-|—|n\/a|perlu semakan editor|\.\.\.)\.?$/i;
const clean = (v: string) => (EMPTY.test(v.trim()) ? "" : v.trim());
const yearIn = (v: string): number | null => {
  const m = /(?<![0-9])(1[5-9][0-9]{2}|20[0-9]{2})(?![0-9])/.exec(v);
  return m ? Number(m[1]) : null;
};
/** An ISBN is only kept when it looks like one; a chatbot that invents a number is dropped. */
const isbnOf = (v: string): string => {
  const t = v.trim();
  const digits = t.replace(/[^0-9Xx]/g, "");
  return /^[0-9Xx\- ]+$/.test(t) && (digits.length === 10 || digits.length === 13) ? t : "";
};

export function parseWorkFill(answer: string): WorkFillResult {
  const lines = answer.replace(/\r\n/g, "\n").replace(/^```[a-z]*\s*$/gim, "").split("\n");
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (const line of lines) {
    const m = SECTION.exec(line);
    if (m) {
      current = m[1]!.toUpperCase();
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (current) sections[current]!.push(line);
  }

  const info = sections.MAKLUMAT ?? [];
  const characters: WorkFillResult["characters"] = [];
  const watak = (sections.WATAK ?? []).join("\n");
  if (!/^\s*tiada watak\.?\s*$/im.test(watak)) {
    for (const block of watak.split(/\n\s*(?:_{3,}|-{3,}|={3,})\s*\n|\n\s*\n/)) {
      const rows = block.split("\n");
      const name = clean(field(rows, /nama|watak/));
      const role = clean(field(rows, /peranan|peranan watak/));
      if (name && role) characters.push({ name, role, first: clean(field(rows, /muncul|kemunculan pertama|bab/)) });
    }
  }

  const src = sections.SUMBER;
  const source = src
    ? {
        title: clean(field(src, /tajuk asal|tajuk/)),
        author: clean(field(src, /pengarang asal|pengarang|penulis asal/)),
        language: clean(field(src, /bahasa asal|bahasa/)),
        basis: clean(field(src, /asas teks|asas/)),
        firstPublished: yearIn(clean(field(src, /tahun terbit pertama|terbit pertama|tahun terbit/))),
        publisher: clean(field(src, /penerbit/)),
        editionYear: yearIn(clean(field(src, /tahun cetakan/))),
        printing: clean(field(src, /cetakan ke|cetakan/)),
        editor: clean(field(src, /penyunting/)),
        translator: clean(field(src, /penterjemah|penerjemah/)),
        isbn: isbnOf(clean(field(src, /isbn/))),
        locator: clean(field(src, /lokasi petikan|lokasi/))
      }
    : null;

  return {
    dek: clean(field(info, /dek/)),
    genre: clean(field(info, /genre/)),
    characters,
    glossaryText: ["[GLOSARI]", ...(sections.GLOSARI ?? [])].join("\n"),
    source: source && Object.values(source).some((v) => v !== "" && v !== null) ? source : null,
    sections: Object.keys(sections)
  };
}
