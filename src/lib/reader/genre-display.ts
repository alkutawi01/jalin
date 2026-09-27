/**
 * Reader-safe genre display.
 *
 * Genre is free-text editorial metadata. Placeholder values (the
 * frontmatter sentinel "needs_review" and its variants) and empty values
 * must never reach the public reader: the header omits the genre and
 * keeps only the type label. This helper never mutates stored values.
 */

const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  "needs_review",
  "needs review",
  "needs-review",
  "-",
  "—",
]);

export function displayableGenre(
  genre: string | null | undefined
): string | undefined {
  if (genre === null || genre === undefined) return undefined;
  const value = genre.trim();
  if (value === "") return undefined;
  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) return undefined;
  return value;
}
