/**
 * The dek is shown to readers before they have read anything (work page, cards, share image), so it must tempt and never tell.
 * One rule, used by every chatbot prompt, and a check the editor sees when a chatbot's dek ignores it.
 */

/** The instruction a chatbot is given for the dek (one line, to sit after "Dek:" or in a numbered rule). */
export const DEK_RULE =
  "pancingan, bukan ringkasan: SATU atau dua ayat pendek (tidak lebih 30 perkataan) yang hanya menyatakan suasana, persoalan atau konflik di permulaan. JANGAN ceritakan perkembangan, peristiwa selepas permulaan, perubahan keadaan, rahsia, kejutan atau pengakhiran; bagi episod bersiri, jangan ceritakan apa yang berlaku dalam episod itu selain pembukaannya";

/** Words that usually mean the sentence is telling the story's turn instead of hinting at its start. */
const TURN_WORDS = /\b(akhirnya|rupa-rupanya|ternyata|menyedari|mendapati|sedar bahawa|tidak lama kemudian|setelah itu|lalu|namun begitu)\b/i;

export const DEK_MAX_WORDS = 30;

/** A Malay note for the editor when the dek looks like a summary; null when it looks like a hook. */
export function dekWarning(dek: string): string | null {
  const text = dek.trim();
  if (!text) return null;
  const words = text.split(/\s+/).length;
  const turn = TURN_WORDS.exec(text);
  if (words > DEK_MAX_WORDS) return `Dek: ${words} perkataan, terlalu panjang. Semak supaya tidak membocorkan jalan cerita; ringkaskan kepada suasana atau persoalan di permulaan.`;
  if (turn) return `Dek: mengandungi "${turn[0]}" yang selalunya menceritakan perkembangan. Semak supaya tidak membocorkan jalan cerita.`;
  return null;
}
