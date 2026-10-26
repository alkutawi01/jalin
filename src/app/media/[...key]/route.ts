import { getObject, objectStoreConfig } from "../../../lib/storage/object-store";

export const dynamic = "force-dynamic";

/**
 * The public reads pictures from here, not from the (private) bucket. Only the picture folder is served; the folder of encrypted
 * backups (jalin-kod/) and anything else in the bucket gets a plain 404. A key is never overwritten (it carries a hash of the file),
 * so a served file can be cached for a year.
 */
const PUBLIC_PREFIXES = ["assets/"];
const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif" };

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await context.params;
  const key = parts.map((p) => decodeURIComponent(p)).join("/");
  if (key.includes("..") || key.includes("\\") || !PUBLIC_PREFIXES.some((p) => key.startsWith(p))) return new Response("Not found", { status: 404 });
  const cfg = objectStoreConfig();
  if (!cfg) return new Response("Not found", { status: 404 });
  try {
    const upstream = await getObject(cfg, key);
    if (!upstream || !upstream.body) return new Response("Not found", { status: 404 });
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const headers = new Headers({
      "Content-Type": TYPES[ext] ?? upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response("Unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
