/**
 * One copy, one paste: a single prompt that asks a chatbot for everything it may suggest about an
 * existing work, and the parser for its answer.
 *
 * Principle: the chatbot only HELPS. It never fills credits, images, rights evidence or the manuscript,
 * and it never overwrites something the editor has already written.
 */
import { GLOSSARY_FORMAT, GLOSSARY_RULES } from "./glossary-paste";
import { DEK_EXAMPLES, DEK_RULE } from "./dek-rule";
import { isPlaceholder } from "./placeholder";
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
  return `Anda pembantu editorial Jalin (platform bacaan sastera berilustrasi dalam Bahasa Melayu). Tugas anda: MEMBANTU editor mengisi maklumat karya ${input.type} di bawah. Editor yang memutuskan; anda hanya mencadangkan.

PRINSIP
- Jangan reka fakta, nama atau peristiwa. Jika tidak pasti, kosongkan baris itu atau tulis "perlu semakan editor".
- Jangan sentuh teks karya, kredit, imej atau hak. Hanya isi bahagian di bawah.
- Jawab dengan bahagian berformat di bawah sahaja: tiada pengenalan, tiada penutup, tiada nombor, tiada tanda markdown. Jawapan bermula terus dengan [MAKLUMAT].
- Setiap watak, tempat dan istilah MESTI wujud dalam manuskrip di bawah. Jangan menambah nama yang tidak tertulis dalam teks, walaupun ia kelihatan sesuai.
- Gunakan HANYA manuskrip di bawah. Jangan menggunakan ingatan tentang karya lain atau perbualan lain.
- Jika anda tidak dapat melihat manuskrip penuh sehingga baris TAMAT MANUSKRIP, jangan meneka: jawab hanya dengan satu baris: TEKS TIDAK LENGKAP.

[MAKLUMAT]
Dek: (${DEK_RULE})
${DEK_EXAMPLES}
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
[SEMAKAN]
Perkataan terakhir: (salin tepat enam perkataan terakhir sebelum TAMAT MANUSKRIP, huruf demi huruf)

${manuscriptBlock(input.body)}`;
}

/** The last words of the manuscript: a chatbot must be able to quote them, which proves it received the whole text. */
export function manuscriptTail(body: string, words = 6): string {
  return body.trim().split(/\s+/).filter(Boolean).slice(-words).join(" ");
}

function manuscriptBlock(body: string): string {
  const text = body.trim();
  if (!text) {
    return [
      "MANUSKRIP (belum ada dalam Kandungan: tampal manuskrip lengkap di antara dua baris di bawah)",
      "=== MULA MANUSKRIP ===",
      "[Tampal manuskrip di sini]",
      "=== TAMAT MANUSKRIP ==="
    ].join("\n");
  }
  const count = text.split(/\s+/).filter(Boolean).length;
  return ["MANUSKRIP (" + count + " perkataan; mesti dibaca sehingga akhir)", "=== MULA MANUSKRIP ===", text, "=== TAMAT MANUSKRIP ==="].join("\n");
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
  /** The chatbot's own check: the last words of the manuscript as it quoted them, and whether it said the text was cut off. */
  check: { tail: string; incomplete: boolean };
}

/**
 * A section heading as chatbots really write it: [MAKLUMAT], **[MAKLUMAT]**, ### [MAKLUMAT], [MAKLUMAT]:, MAKLUMAT,
 * **MAKLUMAT**, ## Maklumat. Only a line that is nothing but the heading counts, so ordinary text is never mistaken for one.
 */
const SECTION = /^\s*(?:[#>*_\-•]+\s*)*(?:\d+[.)]\s*)?\[?\s*(MAKLUMAT|WATAK|LATAR|GLOSARI|SUMBER|SEMAKAN)\s*\]?\s*[:：]?\s*[*_]*\s*[:：]?\s*$/i;

/** A bracketed heading that has its content on the same line, or several headings run together on one line. */
const INLINE_HEADING = /\[\s*(MAKLUMAT|WATAK|LATAR|GLOSARI|SUMBER|SEMAKAN)\s*\]/gi;

const LABELS =
  "Dek|Genre|Nama|Peranan|Muncul|Jenis|Keterangan|Istilah|Maksud|Asing|Sebutan|Bahasa asal|Ejaan asal|Tajuk asal|Pengarang asal|Tahun terbit pertama|Penerbit|Tahun cetakan|Cetakan ke|Penyunting|Penterjemah|ISBN|Lokasi petikan|Asas teks|Perkataan terakhir";

/** A line that holds two or more labelled fields ("Dek: ... Genre: ...") is split so that every field is on its own line. */
function explodeLabels(line: string): string[] {
  const hits = line.match(new RegExp(`(?:^|\\s)(?:${LABELS})\\s*:`, "gi"));
  if (!hits || hits.length < 2) return [line];
  return line.split(new RegExp(`\\s+(?=(?:${LABELS})\\s*:)`, "i"));
}

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

// "tidak dinyatakan" is the word the Tambah Karya prompts teach the chatbot for an unknown value; it must not be filled into a field.
const EMPTY = /^(tiada|tidak ada|tidak dinyatakan|tidak diketahui|-|—|n\/a|perlu semakan editor|\.\.\.)\.?$/i;
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

/** The same name twice in one answer (a repeating chatbot, a doubled paste) is one entry, the first; the lists refuse duplicates when saved. */
function uniqueByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.trim().toLocaleLowerCase("ms");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Characters that are invisible but sit inside a copied line: zero-width spaces and joiners, direction marks, the BOM. */
const INVISIBLE = /[​-‏‪-‮⁠﻿]/g;

/**
 * A heading as it may arrive from a chatbot's copy button: markdown escapes (\[MAKLUMAT\]), full-width or lenticular brackets,
 * invisible characters. Used only to recognise a heading; the lines kept as content are not rewritten.
 */
function headingForm(line: string): string {
  return line.replace(INVISIBLE, "").replace(/ /g, " ").normalize("NFKC").replace(/[【〔]/g, "[").replace(/[】〕]/g, "]").replace(/\\([[\]_*#>:-])/g, "$1");
}

export { isPlaceholder };

/** The copied prompt itself (its opening line and its manuscript heading), not an answer. */
export function looksLikePrompt(text: string): boolean {
  return /Anda pembantu editorial Jalin/i.test(text) && /\nPRINSIP\b/.test(text);
}

/**
 * An answer with no headings at all (a chatbot that lost the format): the sections are inferred from the labels themselves.
 * "Dek:" or "Genre:" starts MAKLUMAT, "Jenis:" starts LATAR, "Istilah:" starts GLOSARI, "Tajuk asal:" starts SUMBER, and "Nama:" starts
 * WATAK unless a LATAR entry is open (where "Nama:" belongs to the place or time).
 */
function inferSections(lines: string[], sections: Record<string, string[]>): void {
  let current: string | null = null;
  const label = (line: string) => /^[\s*_\-•>]*(?:\d+[.)]\s*)?[*_]*([A-Za-zÀ-ÿ' ]{2,30}?)[*_]*\s*[:：]/.exec(line)?.[1]?.trim().toLowerCase() ?? "";
  for (const line of lines) {
    const l = label(line);
    if (l === "dek" || l === "genre") current = "MAKLUMAT";
    else if (l === "jenis") current = "LATAR";
    else if (l === "istilah") current = "GLOSARI";
    else if (/^(tajuk asal|pengarang asal)$/.test(l)) current = "SUMBER";
    else if (l === "nama" && current !== "LATAR") current = "WATAK";
    else if (l === "perkataan terakhir") current = "SEMAKAN";
    if (current) (sections[current] = sections[current] ?? []).push(line);
  }
}

export function parseWorkFill(answer: string): WorkFillResult {
  const lines = answer
    .replace(/\r\n/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/ /g, " ")
    .replace(/^```[a-z]*\s*$/gim, "")
    // "[MAKLUMAT] Dek: ..." or "...[WATAK] Nama: ..." on one line: each heading starts its own line.
    .replace(INLINE_HEADING, (heading) => `\n${heading}\n`)
    .split("\n")
    .flatMap(explodeLabels);
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (const line of lines) {
    const m = SECTION.exec(headingForm(line));
    if (m) {
      current = m[1]!.toUpperCase();
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (current) sections[current]!.push(line);
  }

  if (Object.keys(sections).filter((name) => name !== "SEMAKAN").length === 0) inferSections(lines, sections);

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

  const real = (v: string) => (isPlaceholder(v) ? "" : v);
  return {
    dek: real(clean(field(info, /dek|pancingan|hook/))),
    genre: real(clean(field(info, /genre|kategori/))),
    characters: uniqueByName(characters.filter((c) => !isPlaceholder(c.name) && !isPlaceholder(c.role))),
    places: uniqueByName(setting.places.filter((p) => !isPlaceholder(p.name))),
    times: uniqueByName(setting.times.filter((t) => !isPlaceholder(t.name))),
    glossaryText: ["[GLOSARI]", ...(sections.GLOSARI ?? [])].join("\n"),
    source: source && Object.values(source).some((v) => v !== "" && v !== null) ? source : null,
    sections: Object.keys(sections).filter((name) => name !== "SEMAKAN"),
    check: {
      tail: clean(field(sections.SEMAKAN ?? [], /perkataan terakhir|ayat akhir|hujung teks/)),
      incomplete: /TEKS TIDAK LENGKAP/i.test(answer)
    }
  };
}

const plain = (v: string) => v.normalize("NFKC").toLocaleLowerCase("ms").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Does the chatbot's quoted ending come from the real ending of the manuscript? Lenient: punctuation, case and a few words more or fewer
 * do not matter; at least two of the quoted words must sit together in the last sixty words of the text.
 */
export function sawWholeManuscript(result: WorkFillResult, body: string): boolean {
  if (result.check.incomplete) return false;
  const quoted = plain(result.check.tail).split(" ").filter(Boolean);
  if (quoted.length < 2) return false;
  const last = ` ${plain(body.trim().split(/\s+/).slice(-60).join(" "))} `;
  for (let size = Math.min(quoted.length, 4); size >= 2; size -= 1) {
    for (let start = 0; start + size <= quoted.length; start += 1) {
      if (last.includes(` ${quoted.slice(start, start + size).join(" ")} `)) return true;
    }
  }
  return false;
}

export interface GuardedFill {
  result: WorkFillResult;
  notes: string[];
}

/**
 * The chatbot only suggests; what it names must be in the text. Characters whose name is not written in the manuscript,
 * and a "Latar masa" that the manuscript does not support (neither the year nor the era's words), are dropped and said so.
 */
export function guardWorkFill(result: WorkFillResult, body: string): GuardedFill {
  const text = plain(body);
  const notes: string[] = [];
  const inText = (name: string) => {
    const n = plain(name);
    if (!n) return false;
    if (` ${text} `.includes(` ${n} `)) return true;
    const tokens = n.split(" ").filter((t) => t.length > 2);
    return tokens.length > 0 && tokens.every((t) => ` ${text} `.includes(` ${t} `));
  };
  const characters = result.characters.filter((c) => {
    if (inText(c.name)) return true;
    notes.push(`Watak "${c.name}" diabaikan: nama itu tidak tertulis dalam teks.`);
    return false;
  });
  const times = result.times.filter((t) => {
    const years = t.name.match(/(?<![0-9])(1[5-9][0-9]{2}|20[0-9]{2})(?![0-9])/g) ?? [];
    const ok = years.length > 0 ? years.every((y) => text.includes(y)) : inText(t.name);
    if (!ok) notes.push(`Latar masa "${t.name}" diabaikan: teks tidak menyatakannya. Isi sendiri jika anda tahu.`);
    return ok;
  });
  return { result: { ...result, characters, times }, notes };
}
