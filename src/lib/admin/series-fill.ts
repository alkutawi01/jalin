/**
 * "Salin Arahan AI" for the Siri baharu form: the chatbot fills the page of a SERIES (not an episode) from the editor's idea.
 * The prompt is fixed text; the answer is read back as labelled lines and fills the form.
 */
import { DEK_RULE } from "./authoring/dek-rule";
import { DEFAULT_AUDIENCE_BANDS, audienceCodes, audienceValue, type AudienceBand } from "../audience";
import { slugify } from "./import/text-utils";

export interface SeriesFill {
  title?: string;
  slug?: string;
  dek?: string;
  genre?: string;
  audience?: string;
  mode?: "continuous" | "anthology";
  status?: "ongoing" | "completed";
}

export function composeSeriesPrompt(bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): string {
  const labels = bands.map((b) => b.label).join(", ");
  return [
    "TUGAS",
    "Saya sedang mencipta halaman SIRI (bukan episod) di Jalin, platform bacaan sastera berilustrasi dalam Bahasa Melayu. Berdasarkan idea siri yang saya berikan di bawah, sediakan maklumat halaman siri itu sahaja. Jangan tulis episod, jangan reka cerita lanjut.",
    "",
    "PERATURAN",
    "1. Tajuk: pendek, konkrit dan berimej; elakkan pola 'Jangan X', kata kerja perintah dan soalan.",
    `2. Blurb: ${DEK_RULE}.`,
    "3. Genre: SATU genre sahaja (contoh: Fiksyen sejarah, Misteri, Drama keluarga).",
    `4. Audiens: pilih satu atau lebih daripada: ${labels}.`,
    "5. Mod: 'Bersambung' jika episod bersambung dengan satu canon; 'Antologi' jika setiap episod berdiri sendiri.",
    "6. Status: 'Masih diteruskan' atau 'Tamat'.",
    "7. Gunakan Bahasa Melayu piawai. Jangan sebut nama alat AI dalam teks. Jangan guna tanda pisah panjang (—).",
    "",
    "FORMAT JAWAPAN (tepat, satu baris setiap medan, dalam SATU blok kod)",
    "Tajuk: ...",
    "Alamat pautan: huruf kecil, tanpa aksara khas, dipisahkan sempang",
    "Blurb: ...",
    "Genre: ...",
    "Audiens: ...",
    "Mod: Bersambung atau Antologi",
    "Status: Masih diteruskan atau Tamat",
    "",
    "IDEA SIRI",
    "[Tampal idea siri di sini]"
  ].join("\n");
}

const KEYS: Record<string, keyof SeriesFill> = {
  tajuk: "title",
  "alamat pautan": "slug",
  slug: "slug",
  blurb: "dek",
  dek: "dek",
  genre: "genre",
  audiens: "audience",
  khalayak: "audience",
  mod: "mode",
  status: "status"
};

const fold = (v: string) => v.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().trim();

/** Reads the labelled lines a chatbot answered with. Unknown lines are ignored; returns only what it recognised. */
export function parseSeriesAnswer(text: string, bands: AudienceBand[] = DEFAULT_AUDIENCE_BANDS): SeriesFill {
  const out: SeriesFill = {};
  for (const raw of text.replace(/```[a-z]*/gi, "").split(/\r?\n/)) {
    const m = /^\s*[*_#>\-\s]*([A-Za-zÀ-ÿ ]{2,20}?)\s*\**\s*:\s*\**\s*(.+?)\s*$/.exec(raw);
    if (!m) continue;
    const key = KEYS[fold(m[1])];
    const value = m[2].replace(/^\*+|\*+$/g, "").trim();
    if (!key || !value) continue;
    if (key === "audience") {
      const v = audienceValue(audienceCodes(value, bands), bands);
      if (v) out.audience = v;
    } else if (key === "mode") {
      out.mode = /antologi/i.test(value) ? "anthology" : "continuous";
    } else if (key === "status") {
      out.status = /tamat/i.test(value) && !/masih/i.test(value) ? "completed" : "ongoing";
    } else if (key === "slug") {
      out.slug = slugify(value);
    } else {
      out[key] = value as never;
    }
  }
  if (out.title && !out.slug) out.slug = slugify(out.title);
  return out;
}
