/**
 * The dek is shown to readers before they have read anything (work page, cards, share image), so it must tempt and never tell.
 * One rule, used by every chatbot prompt, and a check the editor sees when a chatbot's dek ignores it.
 */

/** The instruction a chatbot is given for the dek (one line, to sit after "Dek:" or in a numbered rule). */
export const DEK_RULE =
  "pancingan, bukan ringkasan: SATU atau dua ayat pendek (tidak lebih 30 perkataan) yang hanya menyatakan suasana, persoalan atau konflik di permulaan. JANGAN ceritakan perkembangan, peristiwa selepas permulaan, perubahan keadaan, rahsia, kejutan atau pengakhiran; bagi episod bersiri, jangan ceritakan apa yang berlaku dalam episod itu selain pembukaannya";

/**
 * Added to a chatbot prompt next to DEK_RULE: a bad dek and a good dek, so the rule is not left to interpretation. The examples are about an
 * invented story, never about the work being filled.
 */
export const DEK_EXAMPLES = [
  "KESILAPAN YANG PALING LAZIM: dek yang merumuskan cerita. Ia tidak boleh menyebut apa yang watak buat, putuskan, temui atau pelajari.",
  "BURUK (merumuskan, membocorkan perkembangan): \"Aina menemui surat lama, mengetahui bahawa ibunya menyimpan rahsia, lalu memutuskan untuk pergi.\"",
  "BAIK (suasana atau persoalan di permulaan, belum menjawab apa-apa): \"Hujan belum reda, dan ada satu nama yang tidak pernah disebut sesiapa di rumah itu.\"",
  "Semak sebelum menjawab: adakah dek menyebut sesuatu yang berlaku selepas halaman pertama, atau sebab dan akibat? Jika ya, tulis semula. Dek yang baik tidak boleh dibaca sebagai ringkasan episod."
].join("\n");

/** Words that usually mean the sentence is telling the story's turn instead of hinting at its start. */
const TURN_WORDS = /\b(akhirnya|rupa-rupanya|ternyata|menyedari|mendapati|mengetahui|memutuskan|sedar bahawa|tidak lama kemudian|selepas|setelah|setelah itu|kemudian|lalu|namun begitu|mendapat teguran|berjaya)\b/i;

export const DEK_MAX_WORDS = 30;

/** A Malay note for the editor when the dek looks like a summary; null when it looks like a hook. */
export function dekWarning(dek: string): string | null {
  const text = dek.trim();
  if (!text) return null;
  const words = text.split(/\s+/).length;
  const turn = TURN_WORDS.exec(text);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  if (sentences > 2) return `Dek: ${sentences} ayat. Dek hanya satu atau dua ayat pendek dan tidak boleh merumuskan cerita.`;
  if (words > DEK_MAX_WORDS) return `Dek: ${words} perkataan, terlalu panjang. Semak supaya tidak membocorkan jalan cerita; ringkaskan kepada suasana atau persoalan di permulaan.`;
  if (turn) return `Dek: mengandungi "${turn[0]}" yang selalunya menceritakan perkembangan. Semak supaya tidak membocorkan jalan cerita.`;
  return null;
}
