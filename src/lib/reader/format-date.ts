const MONTHS = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];

/** Malaysia is UTC+8 all year (no daylight saving). */
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * The calendar day a stored date falls on, in Malaysia. A date with a time ("2026-10-05T18:30:00Z") is a moment: its day is the day
 * it was in Malaysia, not the day it was in UTC. Taking the first ten characters of the stored text showed a work published at
 * 02:30 on the 6th (Malaysia) as the 5th. A date without a time ("2026-09-21") is already a day and is kept as it is.
 * Returns null for anything that is not a date.
 */
export function malaysiaDay(date: string | null | undefined): { year: number; month: number; day: number } | null {
  const text = String(date ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number) as [number, number, number];
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { year, month, day } : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}[T ]/.test(text)) return null;
  const moment = new Date(text);
  if (Number.isNaN(moment.getTime())) return null;
  const local = new Date(moment.getTime() + MALAYSIA_OFFSET_MS);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
}

/** "5 Oktober 2026", or null when there is no date. */
export function formatMalayDate(date: string | null | undefined): string | null {
  const parts = malaysiaDay(date);
  return parts ? `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}` : null;
}
