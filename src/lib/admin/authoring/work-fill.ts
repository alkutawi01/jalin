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
  /** Places and times (Latar tempat, Latar masa) the work already has. */
  placeNames?: string[];
  timeNames?: string[];
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
  const existingPlaces = input.placeNames?.length ? `Tempat yang SUDAH ada (jangan ulang): ${input.placeNames.join(", ")}.\n` : "";
  const existingTimes = input.timeNames?.length ? `Masa yang SUDAH ada (jangan ulang): ${input.timeNames.join(", ")}.\n` : "";
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
Peranan: (peranan ringkas dalam 2 hingga 6 patah perkataan, contoh: Ibu Aminah, Jiran, Jururawat; bukan ayat penuh dan tanpa noktah; tanpa membocorkan cerita)${novela ? `\nMuncul: (slug bab tempat watak mula-mula muncul, salah satu daripada: ${input.chapterSlugs.join(", ")})` : ""}
____
Nama: ...
Peranan: ...${novela ? "\nMuncul: ..." : ""}
(Jika tiada watak yang jelas, tulis hanya: Tiada watak.)

[LATAR]
${existingPlaces}${existingTimes}Latar tempat dan latar masa cerita ini. Jenis: tempat atau masa.
- Tempat: nama tempat seperti dalam teks (kampung, bandar, bangunan, jalan); hanya tempat yang benar-benar disebut atau jelas daripada teks. Keterangan: 2 hingga 8 patah perkataan tentang tempat itu dalam cerita.
- Masa: TAHUN, TEMPOH atau ERA cerita ini berlaku (contoh: Mei 1969, Era Darurat 1948–1960, Awal 1990-an). Ini BUKAN waktu pagi, siang, petang atau malam. Keterangan: 2 hingga 8 patah perkataan tentang zaman itu. Jika teks menyatakan lebih daripada satu zaman (contoh: kisah lampau dan kini), tulis satu baris masa bagi setiap zaman, tetapi HANYA zaman yang tahun, dekad atau era-nya boleh ditentukan daripada teks; jangan tulis ungkapan kabur seperti "tahun-tahun kemudian" atau "masa lalu".
- Jangan meneka. Jika teks tidak menyatakan atau tidak memberi petunjuk yang jelas tentang tahun atau era, tulis hanya satu baris: Tiada latar masa dinyatakan. Begitu juga jika tiada tempat yang jelas: Tiada latar tempat dinyatakan.
Jenis: tempat
Nama: (nama tempat)
Keterangan: (2 hingga 8 patah perkataan)
____
Jenis: masa
Nama: (tahun, tempoh atau era)
Keterangan: (2 hingga 8 patah perkataan)

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
  /** Latar tempat and latar masa from [LATAR]. */
  places: { name: string; description: string }[];
  times: { name: string; description: string }[];
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

/**
 * A section heading as chatbots really write it: [MAKLUMAT], **[MAKLUMAT]**, ### [MAKLUMAT], [MAKLUMAT]:, MAKLUMAT,
 * **MAKLUMAT**, ## Maklumat. Only a line that is nothing but the heading counts, so ordinary text is never mistaken for one.
 */
const SECTION = /^\s*(?:[#>*_\-•]+\s*)*(?:\d+[.)]\s*)?\[?\s*(MAKLUMAT|WATAK|LATAR|GLOSARI|SUMBER)\s*\]?\s*[:：]?\s*[*_]*\s*[:：]?\s*$/i;

const NAME_LINE = /^[\s*_\-•>]*(?:\d+[.)]\s*)?[*_]*(?:nama|watak)[*_]*\s*[:：]/i;

/** Splits the character section into one list of lines per character: by separators, blank lines, or a new "Nama:". */
function characterBlocks(text: string): string[][] {
  const blocks: string[][] = [];
  for (const chunk of text.split(/\n\s*(?:_{3,}|-{3,}|={3,})\s*\n|\n\s*\n/)) {
    let current: string[] = [];
    let hasName = false;
    for (const line of chunk.split("\n")) {
      if (NAME_LINE.test(line)) {
        if (hasName) {
          blocks.push(current);
          current = [];
        }
        hasName = true;
      }
      current.push(line);
    }
    blocks.push(current);
  }
  return blocks;
}

function field(block: string[], names: RegExp): string {
  for (const line of block) {
    const m = new RegExp(`^[\\s*_\\-•>]*(?:\\d+[.)]\\s*)?[*_]*(?:${names.source})[*_]*\\s*[:：]\\s*[*_]*\\s*(.*)$`, "i").exec(line);
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

/** Splits [LATAR] into one list of lines per entry: by separators, blank lines, or a new "Jenis:". */
function settingBlocks(text: string): string[][] {
  const blocks: string[][] = [];
  for (const chunk of text.split(/\n\s*(?:_{3,}|-{3,}|={3,})\s*\n|\n\s*\n/)) {
    let current: string[] = [];
    let hasKind = false;
    for (const line of chunk.split("\n")) {
      if (/^[\s*_\-•>]*(?:\d+[.)]\s*)?[*_]*jenis[*_]*\s*[:：]/i.test(line)) {
        if (hasKind) {
          blocks.push(current);
          current = [];
        }
        hasKind = true;
      }
      current.push(line);
    }
    blocks.push(current);
  }
  return blocks;
}

/** Reads the places and times of a [LATAR] section; tolerant of "Tempat: X" / "Masa: Y" one-line forms. */
function parseSetting(text: string): { places: WorkFillResult["places"]; times: WorkFillResult["times"] } {
  const places: WorkFillResult["places"] = [];
  const times: WorkFillResult["times"] = [];
  for (const rows of settingBlocks(text)) {
    const kindText = clean(field(rows, /jenis/)).toLowerCase();
    let name = clean(field(rows, /nama/));
    let description = clean(field(rows, /keterangan|penerangan|huraian/));
    let kind: "tempat" | "masa" | "" = /masa|era|tahun|zaman/.test(kindText) ? "masa" : /tempat|lokasi/.test(kindText) ? "tempat" : "";
    if (!name && !kind) {
      // One-line forms ("Tempat: Seremban - bandar", "Masa: Tahun 1998"): every such line is its own entry.
      for (const line of rows) {
        const m = /^[\s*_\-•>]*(?:\d+[.)]\s*)?[*_]*(tempat|lokasi|masa|era|tahun|zaman)[*_]*\s*[:：]\s*[*_]*\s*(.+)$/i.exec(line);
        if (!m) continue;
        let one = clean(m[2]!.replace(/\*\*|__/g, ""));
        if (!one || /^tiada /i.test(one)) continue;
        let note = "";
        const split = /^(.{2,60}?)\s+[-–—]\s+(.{3,})$/.exec(one);
        if (split) {
          one = split[1]!.trim();
          note = split[2]!.trim();
        }
        (/masa|era|tahun|zaman/i.test(m[1]!) ? times : places).push({ name: one, description: note });
      }
      continue;
    }
    if (!name || /^tiada (latar|masa|tempat)/i.test(name)) continue;
    // "Mei 1969 - selepas rusuhan" on one line: the part after the dash is the description.
    if (!description) {
      const split = /^(.{2,60}?)\s+[-–—:]\s+(.{3,})$/.exec(name);
      if (split) {
        name = split[1]!.trim();
        description = split[2]!.trim();
      }
    }
    (kind === "masa" ? times : places).push({ name, description });
  }
  return { places, times };
}

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
    for (const rows of characterBlocks(watak)) {
      const name = clean(field(rows, /nama|watak/));
      const role = clean(field(rows, /peranan|peranan watak/));
      if (name && role) characters.push({ name, role, first: clean(field(rows, /muncul|kemunculan pertama|bab/)) });
    }
  }

  const setting = parseSetting((sections.LATAR ?? []).join("\n"));

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
    places: setting.places,
    times: setting.times,
    glossaryText: ["[GLOSARI]", ...(sections.GLOSARI ?? [])].join("\n"),
    source: source && Object.values(source).some((v) => v !== "" && v !== null) ? source : null,
    sections: Object.keys(sections)
  };
}
