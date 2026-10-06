/**
 * How a chapter is named beside its number. A novela whose chapters are titled only "BAB 7" was shown as "Bab 7: BAB 7" in the
 * browser tab and in the links to the chapters before and after; a title that only repeats the number is not said twice.
 */

/** True when the title says nothing but the chapter's own number ("BAB 7", "Bab 7.", "bab  7"), or is empty. */
export function titleRepeatsNumber(title: string | null | undefined, position: number): boolean {
  const t = (title ?? "").trim().replace(/[.:]+$/, "");
  return t === "" || new RegExp(`^bab\\s*0*${position}$`, "i").test(t);
}

/** The chapter's own title, or nothing when it only repeats the number. */
export function chapterTitleBesideNumber(title: string | null | undefined, position: number): string | undefined {
  return titleRepeatsNumber(title, position) ? undefined : (title ?? "").trim();
}

/** "Bab 3: Permulaan"; "Bab 7" for a chapter titled only "BAB 7". */
export function chapterPageLabel(position: number, title: string | null | undefined): string {
  const own = chapterTitleBesideNumber(title, position);
  return own ? `Bab ${position}: ${own}` : `Bab ${position}`;
}
