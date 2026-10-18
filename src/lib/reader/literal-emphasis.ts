/** Called on literal text AFTER Markdown parsing. Valid emphasis is already an element.
 * Drop dangling formatting marks beside words; preserve arithmetic, escapes and standalone stars. */
export function cleanLiteralEmphasis(text: string): string {
  return text.replace(/(?<![\p{L}\p{N}\\*])\*+(?=[\p{L}\p{N}])/gu, "")
    .replace(/(?<=[\p{L}\p{N}"'”’])\*+(?![\p{L}\p{N}*])/gu, "");
}

/** Editorial warning, not an automatic mutation of the saved manuscript. */
export function danglingEmphasisParagraphs(markdown: string): number {
  return markdown.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/).filter(paragraph => {
    const prose = paragraph.replace(/\\\*/g, "").replace(/`[^`]*`/g, "").replace(/^\s*\*\s+/gm, "");
    const singles = [...prose.matchAll(/(?<!\*)\*(?!\*)/g)];
    return singles.length % 2 !== 0 && /\*(?=\p{L})|\p{L}\*/u.test(prose);
  }).length;
}

/**
 * A note pasted from a chat or a document can arrive with its italic marks escaped (\*Judul\*), which Markdown shows as stars. A note is
 * prose written by the editor and never wants a literal star, so the escape is removed and the marks italicise.
 */
export function unescapeItalicMarks(text: string): string {
  return (text ?? "").replace(/\\\*/g, "*");
}
