/** True when the date the form sends is the day part of the stored publication time (so nothing was changed). */
export function samePublishedDay(sent: unknown, stored: Date | string | null | undefined): boolean {
  if (typeof sent !== "string" || !stored) return false;
  const storedIso = stored instanceof Date ? stored.toISOString() : String(stored);
  return sent.trim() === storedIso.split("T")[0];
}
