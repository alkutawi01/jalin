export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://jalin.adjung.com").replace(/\/$/, "");

/** A path on this site becomes a full address; an address that is already full (such as a Blob image) is left as it is. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
