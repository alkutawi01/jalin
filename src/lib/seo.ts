export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://jalin.adjung.com").replace(/\/$/, "");

/** A path on this site becomes a full address; an address that is already full (such as a Blob image) is left as it is. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The picture for a shared link (og:image, twitter:image, structured data): the site's own optimiser at 1200px wide, not the original
 * file. The originals are 4 to 9 MB PNGs, above the preview limits of Facebook (8 MB) and X (5 MB), which then show no picture.
 * 1200 and 75 are among the widths and qualities the optimiser accepts (next.config.mjs).
 */
export function shareImageUrl(src: string): string {
  return `${SITE_URL}/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`;
}

export const META_DESCRIPTION_MAX = 160;

/**
 * A description for search results and shared links. Search engines cut it at about 160 characters, so a long dek (the live
 * pages had up to 323) is shortened at a word boundary with an ellipsis instead of being cut mid-word by someone else.
 */
export function clipDescription(text: string, max: number = META_DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,;:—–-]+$/, "") + "…";
}
