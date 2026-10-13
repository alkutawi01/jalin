/**
 * Markdown only closes an *emphasis* when the closing asterisk is not preceded by punctuation, or is followed by a space or
 * punctuation. A word italicised together with its hyphen and a suffix, "*talaqqi-*nya", fails that rule: the asterisks are shown
 * as they are. The hyphen (or other mark) is moved out of the italic, "*talaqqi*-nya", which is how the word is set anyway:
 * the word in italics, the hyphen and the suffix upright. The same for bold, "**tebal-**nya".
 */
export function fixEmphasisBeforeSuffix(markdown: string): string {
  return markdown.replace(
    /(?<!\*)(\*{1,2})(?![\s*])([^*\n]*?[^\s*\p{P}])(\p{P}+)\1(?=[\p{L}\p{N}])/gu,
    (_all, mark: string, word: string, marks: string) => `${mark}${word}${mark}${marks}`
  );
}
