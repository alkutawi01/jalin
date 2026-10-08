/**
 * When the admin session ends while a page is open, every save answers 401 "Sesi anda telah tamat" and the page only shows that sentence:
 * no way on from it, and nothing says the unsaved text is still on the page. The admin shell watches the answers of its own API calls and,
 * on the first such 401, shows a banner with a link to sign in again in a new tab (so the open page, and what was typed in it, stays).
 */

/** Is this answer "the session has ended"? Only the admin's own API, and never the sign-in calls themselves (a wrong password is also a 401). */
export function isSessionExpiredAnswer(url: string, status: number): boolean {
  if (status !== 401) return false;
  const path = (() => {
    try { return new URL(url, "http://local.invalid").pathname; } catch { return url; }
  })();
  return path.startsWith("/api/admin/") && !path.startsWith("/api/admin/auth/");
}

export const SESSION_BANNER = {
  title: "Sesi anda telah tamat.",
  body: "Apa yang anda taip masih ada pada halaman ini. Log masuk semula di tab baharu, kemudian kembali ke sini dan tekan Simpan.",
  link: "Log masuk semula",
  dismiss: "Tutup"
} as const;
