/**
 * The words of the public "Tentang Kami" page, which an editor changes in Tetapan > Halaman Tentang Kami. The title (the slogan) is
 * fixed. Each section's text is written as plain paragraphs (a blank line between them) and may carry a link written
 * [text](/address); storage is page-copy.ts (scope "about_page").
 */

import { pageCopyStore } from "./page-copy";

export const ABOUT_INTRO_DEFAULT = "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu yang mengajak pembaca menyelami dunia melalui cerpen, novela, cerita bersiri, fragmen dan sinopsis.";

export const DEFAULT_ABOUT_COPY = {
  intro: ABOUT_INTRO_DEFAULT,
  "s1.heading": "Apa yang ada di sini",
  "s1.body": "Setiap cerita di Jalin dibaca di laman ini, tanpa akaun dan tanpa iklan. Ada [cerpen](/kategori/cerpen) untuk sekali duduk, [novela](/kategori/novela) yang dibahagi kepada bab, [siri](/kategori/bersiri) yang bersambung dari episod ke episod, [fragmen](/kategori/fragmen) daripada karya yang kita sayangi, dan [sinopsis](/kategori/sinopsis) yang menceritakan semula karya lain dengan suara editorial kami.",
  "s2.heading": "Siapa di sebalik cerita",
  "s2.body": "Jalin diterbitkan oleh Adjung Press. Setiap cerita menyatakan dengan jelas siapa yang menulis, menyunting dan membantu. Sebahagian penulis kami ialah penulis maya, iaitu watak penulis yang dibantu kecerdasan buatan. Mereka sentiasa bekerja di bawah kawal selia editorial manusia. Kenali pasukan dan cara kami bekerja di halaman [Editorial](/editorial).",
  "s3.heading": "Ilustrasi",
  "s3.body": "Cerita di Jalin ditemani gambar. Gambar-gambar itu disediakan dan dipilih oleh pasukan editorial untuk menemani teks, bukan menggantikannya. Hak cipta ilustrasi dinyatakan pada setiap gambar.",
  "s4.heading": "Sinopsis dan fragmen",
  "s4.body": "Sinopsis ialah ringkasan, dan fragmen ialah petikan, daripada karya yang sudah diterbitkan di tempat lain. Kedua-duanya bukan karya itu sendiri. Jalin menyatakan karya asal, pengarang, penerbit dan edisi yang digunakan dalam bahagian \"Tentang karya\", supaya pembaca boleh menjejaki sumbernya dan membeli atau meminjam karya penuh.",
  "s5.heading": "Mula membaca",
  "s5.body": "Belum pasti mahu bermula dari mana? Cuba [sebuah cerpen](/kategori/cerpen): selalunya tidak memakan masa lebih daripada beberapa minit.",
  "s6.heading": "Hubungi kami",
  "s6.body": "Untuk pertanyaan, pembetulan atau cadangan kerjasama, sila e-mel pasukan editorial di [editorial@adjung.com](mailto:editorial@adjung.com)."
} as const;

export const aboutPage = pageCopyStore("about_page", DEFAULT_ABOUT_COPY as Record<keyof typeof DEFAULT_ABOUT_COPY, string>);

export type AboutField = keyof typeof DEFAULT_ABOUT_COPY;
export const ABOUT_SECTIONS = [1, 2, 3, 4, 5, 6] as const;

export async function loadAboutCopy(): Promise<Record<AboutField, string>> {
  const { raw: _raw, ...copy } = await aboutPage.load();
  void _raw;
  return copy as Record<AboutField, string>;
}
