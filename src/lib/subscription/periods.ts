/**
 * Subscription dates (study sections 5.5 and 16). Pure functions. Malaysia has no daylight saving: always UTC+8. A period is
 * [startsAt, endsAt): the end is exclusive. A month added to a day that the target month does not have lands on that month's last
 * day (31 Jan + 1 month = 28 Feb), and time of day is kept.
 */
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

export const TRIAL_DAYS = 14;
export const PLAN_MONTHS = [1, 6, 12] as const;
export type PlanMonths = (typeof PLAN_MONTHS)[number];

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** `instant` plus whole calendar months, counted on the Malaysian wall clock. */
export function addMonthsMYT(instant: Date, months: number): Date {
  if (!Number.isInteger(months)) throw new Error("Months must be a whole number.");
  const wall = new Date(instant.getTime() + MYT_OFFSET_MS);
  const total = wall.getUTCFullYear() * 12 + wall.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const monthIndex = total - year * 12;
  const day = Math.min(wall.getUTCDate(), daysInMonth(year, monthIndex));
  const moved = Date.UTC(year, monthIndex, day, wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds(), wall.getUTCMilliseconds());
  return new Date(moved - MYT_OFFSET_MS);
}

/** The 14-day trial given once when an account is registered (full calendar days). */
export function trialPeriod(registeredAt: Date): { startsAt: Date; endsAt: Date } {
  return { startsAt: registeredAt, endsAt: new Date(registeredAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) };
}

/**
 * A redemption starts now, or when the current access ends if that is later, so a second code is added after the first and
 * nothing already paid for is lost. `currentEndsAt` is the end of the access the reader has now, if any.
 */
export function redemptionPeriod(now: Date, currentEndsAt: Date | null, months: PlanMonths): { startsAt: Date; endsAt: Date } {
  if (!PLAN_MONTHS.includes(months)) throw new Error("Unknown plan length.");
  const startsAt = currentEndsAt && currentEndsAt.getTime() > now.getTime() ? currentEndsAt : now;
  return { startsAt, endsAt: addMonthsMYT(startsAt, months) };
}

/** Whether `at` is inside [startsAt, endsAt). */
export function isActiveAt(period: { startsAt: Date; endsAt: Date }, at: Date): boolean {
  return at.getTime() >= period.startsAt.getTime() && at.getTime() < period.endsAt.getTime();
}

/** "28 Februari 2027, 10:00 pagi (MYT)" */
export function formatEndMYT(date: Date): string {
  const months = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  const wall = new Date(date.getTime() + MYT_OFFSET_MS);
  const hour24 = wall.getUTCHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const part = hour24 < 12 ? "pagi" : hour24 < 15 ? "tengah hari" : hour24 < 19 ? "petang" : "malam";
  const minutes = String(wall.getUTCMinutes()).padStart(2, "0");
  return `${wall.getUTCDate()} ${months[wall.getUTCMonth()]} ${wall.getUTCFullYear()}, ${hour12}:${minutes} ${part} (MYT)`;
}
