export interface ChapterVisualLike {
  role?: string | null;
  anchor?: string | null;
  sectionSlug?: string | null;
}

/**
 * Images for the page being read. A chapter page takes the chapter's own images first, then older images that
 * have no chapter but whose marker is written in this chapter's text (nothing that was placed before is lost).
 * Outside a chapter, only images that belong to no chapter are used.
 */
export function visualsForPage<T extends ChapterVisualLike>(visuals: T[], activeSectionSlug: string | undefined, bodyText: string): T[] {
  if (!activeSectionSlug) return visuals.filter((visual) => !visual.sectionSlug);
  const own = visuals.filter((visual) => visual.sectionSlug === activeSectionSlug);
  const legacy = visuals.filter(
    (visual) => !visual.sectionSlug && Boolean(visual.anchor?.trim()) && bodyText.includes(visual.anchor!.trim())
  );
  return [...own, ...legacy];
}

/**
 * The picture a chapter is headed with: its own hero (role "section", no marker). The reading page, the link preview
 * (WhatsApp, social media) and the search card must all agree on it, so they share this one rule.
 */
export function chapterHeroOf<T extends ChapterVisualLike>(visuals: T[], sectionSlug: string | undefined): T | undefined {
  if (!sectionSlug) return undefined;
  return visuals.find((visual) => visual.role === "section" && visual.sectionSlug === sectionSlug && !visual.anchor);
}

/**
 * The picture an episode of a series is headed with: its own hero if it has one, otherwise the series' picture.
 * An episode does not need a picture of its own.
 */
export function episodeHeroOf<T extends { src: string; alt?: string | null }, S extends { src: string; alt?: string | null }>(
  own: T | undefined,
  series: S | undefined
): { src: string; alt: string } | undefined {
  const pick = own?.src ? own : series?.src ? series : undefined;
  return pick ? { src: pick.src, alt: pick.alt ?? "" } : undefined;
}
