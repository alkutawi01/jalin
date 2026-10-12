/** About 200 words a minute, never less than one minute. */
export function readingMinutesOf(body: string): number {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

/**
 * The minutes to show for a work: the number the editor filled in if there is one, otherwise an estimate from the text
 * (a series episode written and published without the "Minit Bacaan" field showed "Bacaan: —" next to 4,900 words of text).
 * Returns undefined when there is no text to count.
 */
export function readingMinutesFor(stored: unknown, ...texts: Array<string | null | undefined>): number | undefined {
  const given = Number(stored);
  if (Number.isFinite(given) && given > 0) return given;
  const text = texts.filter((t): t is string => typeof t === "string" && t.trim().length > 0).join("\n\n");
  return text ? readingMinutesOf(text) : undefined;
}

/** On a chapter's own page "Bacaan" is that chapter's minutes; the novela's total keeps its own row, so a five-minute chapter does not say 135 minutes. */
export function chapterReadingRows<T extends { label: string; value: string }>(rows: T[], chapterMinutes: number | undefined): Array<T | { label: string; value: string }> {
  if (!chapterMinutes) return rows;
  return rows.flatMap((row) => (row.label === "Bacaan"
    ? [{ label: "Bacaan bab", value: `± ${chapterMinutes} minit` }, { label: "Bacaan novela", value: row.value }]
    : [row]));
}
