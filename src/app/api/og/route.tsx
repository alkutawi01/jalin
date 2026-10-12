import { ImageResponse } from "next/og";
import { SITE_URL, DEFAULT_SHARE_IMAGE } from "../../../lib/seo";

/**
 * The picture of a shared link: a work's hero cropped from the centre to 1200 x 630 (1.91:1). Only this site's own pictures
 * are accepted (the Blob store and our own files), so this is not an open image proxy.
 */
const WIDTH = 1200;
const HEIGHT = 630;
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;

function allowedSource(raw: string): string | null {
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return `${SITE_URL}${raw}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (BLOB_HOST.test(url.hostname)) return url.toString();
    if (url.origin === new URL(SITE_URL).origin) return url.toString();
  } catch { /* not an address */ }
  return null;
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("src") ?? "";
  const src = allowedSource(raw);
  if (!src) return Response.redirect(DEFAULT_SHARE_IMAGE.url, 302);
  try {
    return new ImageResponse(
      (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={WIDTH} height={HEIGHT} alt="" style={{ width: WIDTH, height: HEIGHT, objectFit: "cover" }} />
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400" }
      }
    );
  } catch {
    return Response.redirect(DEFAULT_SHARE_IMAGE.url, 302);
  }
}
