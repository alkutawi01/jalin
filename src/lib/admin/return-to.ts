/**
 * Where to go after signing in. Only a path inside the admin is accepted (never another site, never "//host" or a
 * backslash trick); anything else falls back to the admin home.
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "/admin";
  if (!/^\/admin(?:[/?#]|$)/.test(value)) return "/admin";
  if (value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/admin";
  if (value === "/admin/login" || value.startsWith("/admin/login?") || value.startsWith("/admin/login/")) return "/admin";
  return value;
}
