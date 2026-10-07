export const READING_MINUTES_MAX = 9999;

/**
 * "Minit Bacaan" as the work form sends it: undefined leaves the stored value alone, null or an empty box removes it (the reader
 * then shows an estimate from the text), and a whole number of minutes is kept. Anything else is refused in words the form can
 * show: 2.5 used to reach the database's integer column ('invalid input syntax for type integer: "2.5"') and -3 was stored.
 */
export function parseReadingMinutes(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || (typeof value === "string" && value.trim() === "")) return null;
  const minutes = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > READING_MINUTES_MAX) {
    throw new Error(`Minit bacaan mesti nombor bulat dari 1 hingga ${READING_MINUTES_MAX}, atau kosong (anggaran daripada teks).`);
  }
  return minutes;
}
