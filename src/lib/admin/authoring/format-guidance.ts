/**
 * Guidance appended to the answer format: a self-check the
 * chatbot runs before answering, and a FILLED example (about an invented
 * story) so the chatbot sees realistic values instead of "(placeholder)" text.
 * Modelled on how Adjung Brief prompts its chatbot.
 */

import type { OutputSection, Recipe } from "./recipes";

export const SELF_CHECK = [
  "SEMAKAN SENDIRI (lakukan sebelum memberi jawapan akhir; jangan paparkan hasil semakan)",
  "1. Setiap Petikan ialah teks yang wujud HURUF DEMI HURUF dalam bahan, tanpa tanda petikan tambahan.",
  "2. Setiap istilah glosari ialah perkataan yang benar-benar sukar; tiada nama watak atau lokasi.",
  "3. Setiap Adegan menggambarkan keadaan pada titik itu dalam cerita sahaja (cuaca, waktu, objek, siapa hadir), dan sepadan dengan pilihan Muka.",
  "4. Dek dan ringkasan tidak mendedahkan pengakhiran atau kejutan.",
  "5. Tiada Markdown, tiada nota atau penjelasan di luar format."
].join("\n");

function lines(...items: (string | null)[]): string {
  return items.filter((item): item is string => item !== null).join("\n");
}

export function exampleBlock(recipe: Recipe, sections: OutputSection[]): string {
  const novela = recipe.kind === "novela";
  const has = (name: OutputSection) => sections.includes(name);
  const blocks: string[] = [];

  if (has("KARYA")) {
    blocks.push(
      lines(
        "[KARYA]",
        `Jenis: ${recipe.kind}`,
        "Tajuk: Kunci Almari Lama",
        "Slug: kunci-almari-lama",
        "Dek: Ketika mengemas rumah arwah datuk, seorang cucu menemui sebiji kunci yang tidak muat pada mana-mana pintu.",
        "Genre: misteri keluarga",
        "Penulis: tidak dinyatakan",
        "Anggaran bacaan: 6"
      )
    );
  }
  if (has("SUMBER")) {
    blocks.push(
      lines(
        "[SUMBER]",
        "Tajuk asal: The Old Cupboard Key",
        "Pengarang asal: A. N. Penulis",
        "Bahasa asal: Inggeris",
        "Asal-usul: tidak dinyatakan"
      )
    );
  }
  if (has("BAB")) {
    blocks.push(
      lines(
        "[BAB]",
        "Nombor: 1",
        "Slug: bab-1",
        "Tajuk: Debu di Tingkat Atas",
        "Tajuk dalam manuskrip: BAB 1 - Debu di Tingkat Atas",
        "Ringkasan: Ida membantu ibunya mengosongkan bilik atas dan menemui sebuah almari berkunci.",
        "____",
        "Nombor: 2",
        "Slug: bab-2",
        "Tajuk: Bunyi dari Dalam",
        "Tajuk dalam manuskrip: BAB 2 - Bunyi dari Dalam",
        "Ringkasan: Ida mencari orang yang mungkin tahu asal-usul kunci itu."
      )
    );
  }
  if (has("WATAK")) {
    blocks.push(
      lines(
        "[WATAK]",
        "Nama: Ida",
        "Peranan: Cucu perempuan",
        "Penerangan: Remaja yang sedang membantu keluarganya mengemas rumah arwah datuk.",
        novela ? "Muncul di: bab-1" : null,
        "____",
        "Nama: Mak Cik Rohani",
        "Peranan: Jiran lama",
        "Penerangan: Bekas jiran yang mengenali datuk Ida sejak lama.",
        novela ? "Muncul di: bab-2" : null
      )
    );
  }
  if (has("GLOSARI")) {
    blocks.push(
      lines(
        "[GLOSARI]",
        "Istilah: arwah",
        "Maksud: gelaran bagi orang yang sudah meninggal dunia.",
        novela ? "Muncul di: bab-1" : null,
        "____",
        "Istilah: berkarat",
        "Maksud: ditutupi lapisan perang pada besi yang lama terdedah kepada lembap.",
        novela ? "Muncul di: bab-1" : null
      )
    );
  }
  if (has("GAMBAR")) {
    blocks.push(
      lines(
        "[GAMBAR]",
        "Jenis: hero",
        novela ? "Bab:" : null,
        "Petikan:",
        "Letak: selepas",
        "Nisbah: 3:2",
        "Adegan: A narrow upstairs room in an old wooden house in the afternoon, dust in slanting light from a small window, a tall dark wooden cupboard against the wall with a rusty brass keyhole, a girl seen from behind kneeling in front of it, holding a small brass key.",
        "Bukan dalam adegan: The inside of the cupboard, any other person, the ending of the story.",
        "Muka: from behind",
        "Alt: Seorang gadis melutut di hadapan almari kayu lama di bilik atas yang berhabuk.",
        "Sebab: Memperkenalkan objek dan suasana utama cerita tanpa mendedahkan isinya.",
        "____",
        "Jenis: inline",
        novela ? "Bab: bab-2" : null,
        "Petikan: Mak Cik Rohani memegang kunci itu lama sebelum menjawab.",
        "Letak: selepas",
        "Nisbah: 4:3",
        "Adegan: An elderly woman on a veranda holding a small brass key in both hands, looking down at it, afternoon light, a girl sitting on the step in front of her seen from behind.",
        "Bukan dalam adegan: The cupboard, the contents of the cupboard.",
        "Muka: partial profile",
        "Alt: Seorang wanita tua memegang sebiji kunci kecil di beranda sambil merenungnya.",
        "Sebab: Menunjukkan detik apabila petunjuk pertama ditemui."
      )
    );
  }
  if (has("KANDUNGAN")) {
    blocks.push("[KANDUNGAN]\nPerenggan pertama teks penuh.\n\nPerenggan kedua teks penuh.");
  }

  return [
    "CONTOH FORMAT (rujukan struktur dan tahap butiran SAHAJA; ia tentang cerita lain. Jangan salin isi atau fakta; gantikan dengan kandungan sebenar daripada bahan)",
    blocks.join("\n\n")
  ].join("\n");
}
