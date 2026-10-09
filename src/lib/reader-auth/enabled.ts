/** The on/off switch for reader accounts, kept free of imports so any page or component can read it. */
export function readerAccountsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.READER_ACCOUNTS_ENABLED === "yes";
}
