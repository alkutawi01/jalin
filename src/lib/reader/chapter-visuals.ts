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
