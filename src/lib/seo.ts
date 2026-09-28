export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://jalin.adjung.com").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
