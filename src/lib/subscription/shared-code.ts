/**
 * Shared codes (study section 18): one code that many people may redeem, up to a limit Izzat sets, for example to post in a
 * Telegram channel. These are not the single-use card codes. A shared code is not a secret, so what protects it is the limit,
 * the expiry, one redemption per account and the pause switch, not its length. Pure rules only: no database here.
 */
import { CODE_ALPHABET, checkCharacterFor } from "./redeem-code";
import { addMonthsMYT } from "./periods";
import { randomBytes } from "node:crypto";

export const SHARED_PREFIX = "JLN";
export const SHARED_BODY_LENGTH = 6;

/** A grant is a number of days or a number of months; Izzat picks it per code. */
export type SharedGrant = { unit: "days"; amount: 7 | 14 } | { unit: "months"; amount: 1 | 6 | 12 };

export function isValidSharedGrant(grant: SharedGrant): boolean {
  if (grant.unit === "days") return grant.amount === 7 || grant.amount === 14;
  if (grant.unit === "months") return grant.amount === 1 || grant.amount === 6 || grant.amount === 12;
  return false;
}

/** JLN-XXXXXXC: three letters, six random characters and a check character, shown with one hyphen. */
export function generateSharedCode(): string {
  const bytes = randomBytes(SHARED_BODY_LENGTH);
  let body = "";
  for (let i = 0; i < SHARED_BODY_LENGTH; i++) body += CODE_ALPHABET[bytes[i] & 31];
  return `${SHARED_PREFIX}-${body}${checkCharacterFor(body)}`;
}

/** Typed input to the canonical stored form (JLN-XXXXXXC), or null if it is not a well-formed shared code. */
export function normaliseSharedCodeInput(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s\-_.]/g, "");
  if (!cleaned.startsWith(SHARED_PREFIX)) return null;
  const rest = cleaned.slice(SHARED_PREFIX.length).replace(/O/g, "0").replace(/[IL]/g, "1");
  if (rest.length !== SHARED_BODY_LENGTH + 1) return null;
  if ([...rest].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  const body = rest.slice(0, SHARED_BODY_LENGTH);
  if (checkCharacterFor(body) !== rest[SHARED_BODY_LENGTH]) return null;
  return `${SHARED_PREFIX}-${rest}`;
}

export type SharedCodeState = {
  status: "active" | "paused" | "revoked";
  redeemedCount: number;
  maxRedemptions: number;
  /** The last moment it can be redeemed (exclusive), or null for no expiry. */
  expiresAt: Date | null;
};

export type SharedRedemptionDecision = { ok: true } | { ok: false; reason: "paused" | "revoked" | "expired" | "full" | "already_redeemed" };

/**
 * Whether a redemption may go ahead. The database repeats these checks in one transaction (count increment guarded by the same
 * conditions, UNIQUE(code, account)); this function is the readable statement of the rules and is what the tests pin down.
 */
export function evaluateSharedRedemption(state: SharedCodeState, now: Date, accountAlreadyRedeemed: boolean): SharedRedemptionDecision {
  if (state.status === "revoked") return { ok: false, reason: "revoked" };
  if (state.status === "paused") return { ok: false, reason: "paused" };
  if (state.expiresAt && now.getTime() >= state.expiresAt.getTime()) return { ok: false, reason: "expired" };
  if (accountAlreadyRedeemed) return { ok: false, reason: "already_redeemed" };
  if (state.redeemedCount >= state.maxRedemptions) return { ok: false, reason: "full" };
  return { ok: true };
}

/** The period a shared grant gives: from now, or from the end of current access if that is later. */
export function sharedGrantPeriod(now: Date, currentEndsAt: Date | null, grant: SharedGrant): { startsAt: Date; endsAt: Date } {
  if (!isValidSharedGrant(grant)) throw new Error("Unknown shared grant.");
  const startsAt = currentEndsAt && currentEndsAt.getTime() > now.getTime() ? currentEndsAt : now;
  const endsAt = grant.unit === "days" ? new Date(startsAt.getTime() + grant.amount * 24 * 60 * 60 * 1000) : addMonthsMYT(startsAt, grant.amount);
  return { startsAt, endsAt };
}
