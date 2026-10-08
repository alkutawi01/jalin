/** Rules the reader's glossary and character list depend on. Pure, so they can be tested without a database. */

/** Terms are the same when they differ only in capital letters or surrounding spaces. */
export function sameTerm(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("ms") === b.trim().toLocaleLowerCase("ms");
}

/** The first existing term that matches, ignoring the record being edited. */
export function findDuplicateTerm<T extends { id: number; term: string }>(existing: T[], term: string, ignoreId?: number): T | undefined {
  return existing.find((entry) => entry.id !== ignoreId && sameTerm(entry.term, term));
}

/**
 * Problems with a character list: the same name twice, or a first appearance in a chapter that does not exist (the reader
 * would then show that character in EVERY chapter, which gives away the story). "chapterSlugs" is empty for a work
 * without chapters, in which case any value is left alone.
 */
export function characterProblems(characters: Array<{ name: string; firstAppearanceSection?: string | null }>, chapterSlugs: string[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  characters.forEach((character, index) => {
    const key = character.name.trim().toLocaleLowerCase("ms");
    const first = seen.get(key);
    if (first !== undefined) problems.push(`Watak #${index + 1} "${character.name}" sama nama dengan watak #${first + 1}. Gabungkan atau bezakan namanya.`);
    else seen.set(key, index);
    const section = character.firstAppearanceSection;
    if (section && chapterSlugs.length > 0 && !chapterSlugs.includes(section)) {
      problems.push(`Watak #${index + 1} "${character.name}": bab kemunculan pertama "${section}" tiada dalam novela ini. Pilih bab yang wujud atau kosongkan.`);
    }
  });
  return problems;
}

/**
 * A credit repeats another when the same person (the same contributor, or a guest of the same name) has the same role
 * on the same work. The reader would show the line twice. "existing" is the credits of that one work.
 */
/** A credit the editor cannot save as asked (400), a contributor that is gone (404), a list that changed elsewhere (409): not a server failure. */
export function creditErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("tidak ditemui")) return 404;
  if (message.includes("telah berubah")) return 409;
  if (message.startsWith("Pilih penyumbang") || message.startsWith("Peranan \"")) return 400;
  return 500;
}

export function findDuplicateCredit<T extends { id: number; contributor_slug: string | null; guest_name: string | null; role_label: string }>(
  existing: T[],
  candidate: { contributorSlug?: string | null; guestName?: string | null; roleLabel: string },
  ignoreId?: number
): T | undefined {
  return existing.find((entry) => {
    if (entry.id === ignoreId || !sameTerm(entry.role_label, candidate.roleLabel)) return false;
    if (candidate.contributorSlug) return entry.contributor_slug === candidate.contributorSlug;
    if (candidate.guestName) return !!entry.guest_name && sameTerm(entry.guest_name, candidate.guestName);
    return false;
  });
}
