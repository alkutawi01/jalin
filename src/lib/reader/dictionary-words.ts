/**
 * House style: a word that is in Kamus Dewan (Edisi Keempat) is Malay and is not set in italics, however it was marked in the text
 * (a chatbot's list of foreign words, or italics carried over from a pasted document). Italics stay for words that are not in it.
 *
 * Each word below was looked up in PRPM (prpm.dbp.gov.my) and has its own entry in Kamus Dewan Edisi Keempat. Add a word only
 * after checking it there; a word not in the dictionary (mushaf, tasmi', talaqqi at the time of writing) keeps its italics.
 * Comparison ignores case. Only a span that is exactly one of these words is affected: "*qiraat*" becomes qiraat, while
 * "*bacaan qiraat Hafs*" (a phrase) is left as the editor wrote it.
 */
export const KAMUS_DEWAN_WORDS: ReadonlySet<string> = new Set([
  "qiraat",
  "murajaah",
  "hafiz",
  "tahfiz"
]);

export function isDictionaryWord(word: string): boolean {
  return KAMUS_DEWAN_WORDS.has(word.trim().toLocaleLowerCase("ms"));
}

/** Removes *italic* marks round a single word that is in the list; every other mark is left alone. */
export function unitaliciseDictionaryWords(markdown: string): string {
  return markdown.replace(/(?<!\*)\*([^\s*]+)\*(?!\*)/g, (all, word: string) => (isDictionaryWord(word) ? word : all));
}
