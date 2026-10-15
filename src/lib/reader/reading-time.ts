/** About 200 words a minute, never less than one minute. */
export function readingWordCount(body: string): number {
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[?(?:IMAGE|GAMBAR|VISUAL)[^\]\n]*\]\]?/gi, " ");
  return (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length;
}

export function readingMinutesOf(body: string): number {
  const words = readingWordCount(body);
  return Math.max(1, Math.round(words / 200));
}

/**
 * Text is the only authority, including for old published snapshots with manual minutes.
 * Returns undefined when there is no text to count.
 */
export function readingMinutesFor(_stored: unknown, ...texts: Array<string | null | undefined>): number | undefined {
  const text = texts.filter((t): t is string => typeof t === "string" && t.trim().length > 0).join("\n\n");
  return readingWordCount(text) ? readingMinutesOf(text) : undefined;
}

/** On a chapter's own page "Bacaan" is that chapter's minutes; the novela's total keeps its own row, so a five-minute chapter does not say 135 minutes. */
export function chapterReadingRows<T extends { label: string; value: string }>(rows: T[], chapterMinutes: number | undefined): Array<T | { label: string; value: string }> {
  if (!chapterMinutes) return rows;
  return rows.flatMap((row) => (row.label === "Bacaan"
    ? [{ label: "Bab ini", value: `± ${chapterMinutes} minit` }, { label: "Novela", value: row.value }]
    : [row]));
}
