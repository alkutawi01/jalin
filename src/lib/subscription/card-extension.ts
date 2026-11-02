import { summariseAccess, type AccessPeriod } from "./access";
import { addMonthsMYT } from "./periods";

export type CardExtensionDecision =
  | { allowed: true }
  | { allowed: false; reason: "queued"; availableAt: Date }
  | { allowed: false; reason: "year_limit"; maximumEndsAt: Date };

/** Izzat, 2 Nov 2026: one future card; its slot reopens exactly when that card starts. */
export function cardExtensionDecision(periods: readonly AccessPeriod[], now: Date, proposedEndsAt: Date): CardExtensionDecision {
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(proposedEndsAt.getTime())) {
    throw new Error("Invalid date for card extension.");
  }
  const cards = periods.filter((period) => period.kind === "CARD" && !period.revokedAt && period.endsAt > now);
  const queued = cards.filter((period) => period.startsAt > now);
  if (queued.length > 0) {
    // Preserve legacy grants too: the slot is free only after the last future card has started.
    const availableAt = queued.reduce((latest, period) => period.startsAt > latest ? period.startsAt : latest, queued[0].startsAt);
    return { allowed: false, reason: "queued", availableAt };
  }
  const activeCards = cards.filter((period) => period.startsAt <= now);
  const baseEnd = activeCards.length > 0
    ? activeCards.reduce((latest, period) => period.endsAt > latest ? period.endsAt : latest, activeCards[0].endsAt)
    : summariseAccess(periods, now).currentPeriodEndsAt ?? now;
  const maximumEndsAt = addMonthsMYT(baseEnd, 12);
  return proposedEndsAt > maximumEndsAt
    ? { allowed: false, reason: "year_limit", maximumEndsAt }
    : { allowed: true };
}
