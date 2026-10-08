/**
 * The labelled-text answer format the chatbot is asked to produce, and that
 * "Tampal" reads (see labelled-output.ts).
 *
 * This block is owned by the code, NOT by the editable prompt text in
 * Tetapan, so editing a prompt can never break parsing. Plain labelled text
 * (no JSON, no Markdown) is used because chatbots keep to it far more reliably.
 */

import { DEK_RULE } from "./dek-rule";
import { SELF_CHECK, exampleBlock } from "./format-guidance";
import type { OutputSection, Recipe } from "./recipes";

export const FORMAT_VERSION = "v4";

export const SECTION_NAMES: OutputSection[] = ["KARYA", "SIRI", "KANDUNGAN", "BAB", "SUMBER", "WATAK", "LATAR", "GLOSARI", "GAMBAR"];

export interface FormatOptions {
  /** bersiri only: true when the editor is starting a new series (asks for the [SIRI] section). */
  newSeries?: boolean;
}

const INTRO = [
  "FORMAT JAWAPAN (WAJIB DIIKUTI TEPAT)",
  "Balas dengan teks biasa sahaja mengikut bahagian di bawah, mengikut turutan. Tiada pengenalan, tiada penutup, tiada Markdown (jangan guna **, #, tanda bintang atau blok kod).",
  "Setiap bahagian bermula dengan tajuknya dalam kurungan siku, contoh [KARYA]. Setiap maklumat ditulis sebagai \"Label: nilai\" pada satu baris; nilai yang panjang boleh bersambung pada baris berikutnya.",
  "Bahagian yang mengandungi banyak item (watak, glosari, gambar, bab) diasingkan satu item daripada satu lagi dengan satu baris yang hanya mengandungi ____",
  "Jika sesuatu maklumat tiada dalam bahan, tulis: tidak dinyatakan"
].join("\n");

function karya(recipe: Recipe): string {
  return [
    "[KARYA]",
    `Jenis: ${recipe.kind}`,
    "Tajuk: (tajuk karya)",
    "Slug: (huruf kecil latin dipisahkan tanda -, tanpa simbol)",
    `Dek: (${DEK_RULE})`,
    "Genre: (satu label, contoh drama, keluarga, misteri, sejarah)",
    "Penulis: (nama penulis jika dinyatakan dalam bahan)",
    "Anggaran bacaan: (nombor minit, perkataan dibahagi 200)"
  ].join("\n");
}

const SIRI = [
  "[SIRI]",
  "Tajuk siri: (tajuk siri)",
  "Mod: (bersambung atau antologi)",
  "Dek siri: (satu atau dua ayat tentang siri ini)"
].join("\n");

const BAB = [
  "[BAB]",
  "Nombor: 1",
  "Slug: bab-1",
  "Tajuk: (tajuk bab tanpa perkataan Bab dan nombor)",
  "Tajuk dalam manuskrip: (baris tajuk bab SEPERTI YANG TERTULIS dalam manuskrip, huruf demi huruf)",
  "Ringkasan: (ringkasan pendek bab tanpa spoiler bab kemudian)",
  "____",
  "(ulang untuk SETIAP bab mengikut turutan dalam manuskrip)"
].join("\n");

const KANDUNGAN = [
  "[KANDUNGAN]",
  "(teks penuh karya dalam perenggan biasa. Satu baris kosong antara perenggan. Tiada Markdown.)"
].join("\n");

const SUMBER = [
  "[SUMBER]",
  "Tajuk asal: (tajuk karya asal dalam bahasa asalnya, bukan terjemahan)",
  "Pengarang asal: (nama pengarang karya asal)",
  "Bahasa asal: (bahasa asal karya itu)",
  "Asal-usul: (keterangan sumber hanya jika dinyatakan dalam bahan)"
].join("\n");

function watak(recipe: Recipe): string {
  const lines = ["[WATAK]", "Nama: (nama watak)", "Peranan: (peranan ringkas dalam 2 hingga 6 patah perkataan, contoh: Ibu Aminah, Jiran, Jururawat; bukan ayat penuh dan tanpa noktah)", "Penerangan: (berdasarkan teks sahaja, tanpa spoiler)"];
  if (recipe.kind === "novela") lines.push("Muncul di: (slug bab pertama watak ini muncul, contoh bab-1)");
  lines.push("____", "(ulang untuk setiap watak yang benar-benar wujud dalam teks)");
  return lines.join("\n");
}

const LATAR = [
  "[LATAR]",
  "Jenis: tempat",
  "Nama: (nama tempat seperti dalam teks; hanya tempat yang benar-benar disebut atau jelas)",
  "Keterangan: (2 hingga 8 patah perkataan tentang tempat itu dalam cerita)",
  "____",
  "Jenis: masa",
  "Nama: (TAHUN, TEMPOH atau ERA cerita ini berlaku, contoh: Mei 1969 atau Era Darurat 1948–1960; BUKAN waktu pagi, siang atau malam)",
  "Keterangan: (2 hingga 8 patah perkataan tentang zaman itu)",
  "____",
  "(satu item bagi setiap tempat penting dan setiap zaman yang tahun, dekad atau era-nya boleh ditentukan daripada teks, bukan ungkapan kabur seperti \"tahun-tahun kemudian\"; jika teks tidak menyatakan atau tidak memberi petunjuk yang jelas tentang tahun atau era, tulis hanya: Tiada latar masa dinyatakan; jangan meneka)"
].join("\n");

function glosari(recipe: Recipe): string {
  const lines = ["[GLOSARI]", "Istilah: (perkataan seperti dieja dalam teks)", "Maksud: (maksud berdasarkan konteks dalam teks)"];
  lines.push("Sebutan: (pilihan; hanya perkataan pinjaman asing yang anda pasti, cth. mu-dif. Tinggalkan baris ini jika tidak berkenaan)", "Bahasa asal: (pilihan, cth. Arab)", "Ejaan asal: (pilihan; istilah dalam tulisan bahasa asalnya)");
  if (recipe.kind === "novela") lines.push("Muncul di: (slug bab pertama istilah ini digunakan)");
  lines.push("____", "(ulang untuk setiap istilah, sehingga 8 sahaja; kosongkan jika tiada perkataan sesuai)");
  return lines.join("\n");
}

function gambar(recipe: Recipe): string {
  const hasChapters = recipe.kind === "novela";
  const lines = [
    "[GAMBAR]",
    "Jenis: hero",
    hasChapters ? "Bab: (kosong untuk hero)" : null,
    "Petikan: (kosong untuk hero)",
    "Letak: selepas",
    "Nisbah: 3:2",
    "Adegan: (satu perenggan bahasa Inggeris, sedia digunakan sebagai arahan penjana imej)",
    "Bukan dalam adegan: (apa yang tidak wujud atau belum berlaku dalam adegan ini)",
    "Muka: (satu pilihan cara muka dilindungi, lihat peraturan gambar)",
    "Alt: (satu ayat bahasa Melayu menerangkan gambar)",
    "Sebab: (satu ayat bahasa Melayu mengapa gambar ini membantu pembaca)",
    "____",
    `Jenis: inline`,
    hasChapters ? "Bab: (slug bab tempat adegan berlaku)" : null,
    "Petikan: (satu perenggan atau ayat disalin HURUF DEMI HURUF daripada teks)",
    "Letak: selepas atau sebelum",
    "Nisbah: 4:3",
    "(dan seterusnya untuk setiap gambar inline)"
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

const RENDERERS: Record<OutputSection, (recipe: Recipe) => string> = {
  KARYA: karya,
  SIRI: () => SIRI,
  KANDUNGAN: () => KANDUNGAN,
  BAB: () => BAB,
  SUMBER: () => SUMBER,
  WATAK: watak,
  LATAR: () => LATAR,
  GLOSARI: glosari,
  GAMBAR: gambar
};

/** Sections the chatbot must return for this recipe (bersiri asks for [SIRI] only for a new series). */
export function sectionsFor(recipe: Recipe, options: FormatOptions = {}): OutputSection[] {
  return recipe.sections.filter((section) => section !== "SIRI" || options.newSeries === true);
}

export function buildFormatBlock(recipe: Recipe, options: FormatOptions = {}): string {
  const sections = sectionsFor(recipe, options);
  const parts = sections.map((section) => RENDERERS[section](recipe));
  return [INTRO, "", parts.join("\n\n"), "", SELF_CHECK, "", exampleBlock(recipe, sections)].join("\n");
}
