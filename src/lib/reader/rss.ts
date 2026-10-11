import { SITE_URL, absoluteUrl } from "../seo";

/** One entry of the public feed: what a feed reader needs to show a new work and link to it, and nothing of the text itself. */
export interface FeedItem {
  title: string;
  /** A path on this site, "/kategori/cerpen/sebelum-lampu-padam". */
  path: string;
  /** ISO date (or date-time). */
  publishedAt?: string;
  dek?: string;
  /** "Cerpen", "Novela", ... shown as the entry's category. */
  category?: string;
}

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

/** Text for an XML element or attribute: the five characters that matter, and the control characters XML does not allow, removed. */
export function xmlEscape(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch] ?? ch);
}

function rfc822(date: string | undefined): string | null {
  if (!date) return null;
  const time = Date.parse(date);
  return Number.isFinite(time) ? new Date(time).toUTCString() : null;
}

export const FEED_LIMIT = 30;

/** RSS 2.0 of the newest published works; the newest first, undated ones left out, at most FEED_LIMIT. */
export function buildRss(items: FeedItem[], now: Date = new Date()): string {
  const dated = items
    .map((item) => ({ item, date: rfc822(item.publishedAt), time: item.publishedAt ? Date.parse(item.publishedAt) : NaN }))
    .filter((entry): entry is { item: FeedItem; date: string; time: number } => entry.date !== null && Number.isFinite(entry.time))
    .sort((a, b) => b.time - a.time || a.item.title.localeCompare(b.item.title, "ms"))
    .slice(0, FEED_LIMIT);
  const channelDate = dated.length > 0 ? dated[0].date : now.toUTCString();
  const entries = dated.map(({ item, date }) => {
    const link = absoluteUrl(item.path);
    return [
      "    <item>",
      `      <title>${xmlEscape(item.title)}</title>`,
      `      <link>${xmlEscape(link)}</link>`,
      `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
      `      <pubDate>${date}</pubDate>`,
      ...(item.category ? [`      <category>${xmlEscape(item.category)}</category>`] : []),
      ...(item.dek ? [`      <description>${xmlEscape(item.dek)}</description>`] : []),
      "    </item>"
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>Jalin</title>",
    `    <link>${xmlEscape(SITE_URL)}/</link>`,
    "    <description>Karya terbaharu di Jalin: cerpen, novela, cerita bersiri, fragmen dan sinopsis berilustrasi dalam Bahasa Melayu.</description>",
    "    <language>ms</language>",
    `    <lastBuildDate>${channelDate}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml" />`,
    ...entries,
    "  </channel>",
    "</rss>",
    ""
  ].join("\n");
}
