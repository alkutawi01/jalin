/**
 * Where to send a reader after signing in. Only a path on this site is accepted: it must start with one slash, and not "//" or "/\\"
 * (another site), and holds no control characters. Anything else becomes the fallback, so the sign-in pages cannot be used as an open redirect.
 */
export function safeNextPath(value: unknown, fallback = "/akaun"): string {
  const text = typeof value === "string" ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
  if (!text || text.length > 300) return fallback;
  if (!text.startsWith("/") || text.startsWith("//") || text.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(text)) return fallback;
  return text;
}
