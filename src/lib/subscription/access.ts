/**
 * What a reader may read, worked out from their access periods alone (study sections 5.5, 5.11, 14 to 16). Pure functions: no database.
 * The ledger table is `entitlements`; a period here is one of its rows.
 */
export type EntitlementKind = "TRIAL" | "CARD" | "SHARED" | "ADMIN";

export type AccessPeriod = {
  kind: EntitlementKind;
  startsAt: Date;
  endsAt: Date;
  /** A cancelled period gives no access. */
  revokedAt?: Date | null;
};

/** trial: inside the free 14 days; subscribed: inside a period given by a card, a shared code or Izzat; expired: had access, has none now. */
export type AccessState = "trial" | "subscribed" | "expired" | "none";

export type AccessSummary = {
  state: AccessState;
  /**
   * When the access ends: the end of the unbroken run the reader is in (periods that follow one another are one run), or when the last
   * period ended if expired, or null. A gap after a cancelled period ends the run.
   */
  endsAt: Date | null;
  /** When the period in force right now ends (the latest end among those in force), or null. */
  currentPeriodEndsAt: Date | null;
  /** The kinds in force right now. */
  activeKinds: EntitlementKind[];
};

const inForce = (p: AccessPeriod, at: Date) => !p.revokedAt && p.startsAt.getTime() <= at.getTime() && at.getTime() < p.endsAt.getTime();

/** Follow periods that start no later than the end reached, so back-to-back grants read as one run of access. */
function chainEnd(periods: readonly AccessPeriod[], from: Date): Date {
  let end = from;
  let moved = true;
  while (moved) {
    moved = false;
    for (const p of periods) {
      if (!p.revokedAt && p.startsAt.getTime() <= end.getTime() && p.endsAt.getTime() > end.getTime()) { end = p.endsAt; moved = true; }
    }
  }
  return end;
}

export function summariseAccess(periods: readonly AccessPeriod[], at: Date): AccessSummary {
  const live = periods.filter((p) => inForce(p, at));
  if (live.length > 0) {
    const paid = live.some((p) => p.kind !== "TRIAL");
    const current = live.reduce((max, p) => (p.endsAt.getTime() > max.getTime() ? p.endsAt : max), live[0].endsAt);
    return { state: paid ? "subscribed" : "trial", endsAt: chainEnd(periods, current), currentPeriodEndsAt: current, activeKinds: [...new Set(live.map((p) => p.kind))] };
  }
  const given = periods.filter((p) => !p.revokedAt && p.startsAt.getTime() <= at.getTime());
  if (given.length > 0) {
    const last = given.reduce((max, p) => (p.endsAt.getTime() > max.getTime() ? p.endsAt : max), given[0].endsAt);
    return { state: "expired", endsAt: last, currentPeriodEndsAt: null, activeKinds: [] };
  }
  return { state: "none", endsAt: null, currentPeriodEndsAt: null, activeKinds: [] };
}

/**
 * Where a new grant starts: now, or when the access the reader has (trial included) ends, if that is later, so nothing already given
 * is lost and a code redeemed during the trial is added after it. Periods that have not started yet count too.
 */
export function stackStart(periods: readonly AccessPeriod[], now: Date): Date {
  let start = now;
  for (const p of periods) {
    if (!p.revokedAt && p.endsAt.getTime() > start.getTime()) start = p.endsAt;
  }
  return start;
}

export type ReadDecision = "allow" | "sign_in" | "subscribe";

/**
 * May this visitor read the full text of a work? `paywallOn` is the switch that stays off until the first cards are on sale
 * (study 5.11): while it is off, everything is open to everyone, exactly as the site works today.
 */
export function readDecision(input: { paywallOn: boolean; signedIn: boolean; isTeaser: boolean; access: AccessSummary | null }): ReadDecision {
  if (!input.paywallOn || input.isTeaser) return "allow";
  if (!input.signedIn) return "sign_in";
  const state = input.access?.state ?? "none";
  return state === "trial" || state === "subscribed" ? "allow" : "subscribe";
}
