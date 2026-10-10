/** The on/off switch for reader accounts, kept free of imports so any page or component can read it. */
/** The metadata of an account page, or the plain 404 metadata when accounts are off (the page then answers 404, and the title has to match). */
export function accountsPageMetadata<T extends object>(meta: T, env: Record<string, string | undefined> = process.env): T | { title: string; robots: { index: false; follow: false } } {
  return readerAccountsEnabled(env) ? meta : { title: "Halaman tidak ditemui", robots: { index: false, follow: false } };
}

export function readerAccountsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.READER_ACCOUNTS_ENABLED === "yes";
}
