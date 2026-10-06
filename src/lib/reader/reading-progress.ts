/**
 * How far through a story the reader has scrolled, from 0 (the top of the text is at the top of the screen) to 1 (the end of the text
 * is at the bottom of the screen). A text that fits on one screen has no progress to show (null).
 */
export function readingProgress(scrollY: number, textTop: number, textHeight: number, viewportHeight: number): number | null {
  const scrollable = textHeight - viewportHeight;
  if (!Number.isFinite(scrollable) || scrollable <= 0) return null;
  const done = (scrollY - textTop) / scrollable;
  return Math.min(1, Math.max(0, done));
}
