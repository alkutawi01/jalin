/**
 * Reader-safe genre display.
 *
 * Genre is free-text editorial metadata. Placeholder values (the
 * frontmatter sentinel "needs_review" and its variants) and empty values
 * must never reach the public reader: the header omits the genre and
 * keeps only the type label. This helper never mutates stored values.
 *
 * One genre only: a stored value that lists two ("Keluarga · Ingatan") shows its first, the main one, so a kicker never reads
 * "Cerpen · Keluarga · Ingatan" and a search by genre matches one value.
 *
 * A genre is shown with a capital first letter whatever the editor typed ("sejarah" and "Sejarah" were both on the site,
 * side by side in the same list); only the first letter is changed.
 */
import { capitaliseFirst } from "../capitalise-first";

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
  const value = genre.split("·")[0]!.trim();
  if (value === "") return undefined;
  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) return undefined;
  return capitaliseFirst(value);
}
