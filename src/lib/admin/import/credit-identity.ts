import { authorSlug } from "../../reader/author-alias";

export type ContributorName = { slug: string; display_name: string };

const norm = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const slugOf = (value: string) => norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * The name typed in "Nama penulis" when a work is added is a plain name. When it is the name of a contributor Jalin already has (an AI
 * persona such as "Rafiq Naim" or "Nara Zahin", or a person), the credit must belong to that contributor: saved as a guest name it
 * showed as a human called "Rafiq Naim", with no AI label and no link to the author's page, and passed the credit check.
 *
 * Returns the contributor's slug, or null when no contributor has the name (it stays a guest) or when two different contributors
 * have it (never guess whose work it is). An older pen-name address ("rafiq-naim") resolves to the editor's record ("chatgpt").
 */
export function matchContributorSlug(name: string, contributors: ContributorName[]): string | null {
  const wanted = norm(name);
  if (!wanted) return null;
  const wantedSlug = slugOf(name);
  const resolved = new Set<string>();
  const known = new Set(contributors.map((c) => c.slug));
  for (const contributor of contributors) {
    if (norm(contributor.display_name) === wanted || contributor.slug === wantedSlug) {
      const record = authorSlug(contributor.slug);
      resolved.add(known.has(record) ? record : contributor.slug);
    }
  }
  return resolved.size === 1 ? Array.from(resolved)[0] : null;
}
