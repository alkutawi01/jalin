/**
 * Reader sign-in by one-time e-mail code (study sections 5.2, 14 to 16, 20). The database does the work here; the pure pieces are
 * in primitives.ts. Every function takes the database (or a transaction), the clock and the mailer, so the same code is tested
 * against a real database inside a transaction that is rolled back.
 *
 * Rules in short: a code is six digits, valid 5 minutes, used once, at most 5 wrong tries. The answer to "send me a code" is the
 * same whether or not the address has an account. A new address becomes an account on its first correct code, with NO access yet.
 * The 14-day trial is a separate step the reader chooses (startTrial), given once per address, ever. An account keeps at most two
 * signed-in devices; a third sign-in must name one to replace.
 */
import type { Kysely, Transaction } from "kysely";
import { sql } from "kysely";
import { randomUUID } from "node:crypto";
import type { Database } from "../db/types";
import { TRIAL_DAYS } from "../subscription/periods";
import { addTrial } from "./entitlements";
import {
  constantTimeEqualHex,
  emailLookupMac,
  generateOtp,
  generateSessionToken,
  hashSessionToken,
  normaliseEmail,
  normaliseOtpInput,
  otpMac,
  trialClaimMac,
  type MacKey,
  type Mailer,
} from "./primitives";

export type Db = Kysely<Database> | Transaction<Database>;

export const LIMITS = {
  otpTtlMinutes: 5,
  maxAttemptsPerChallenge: 5,
  requestCooldownSeconds: 60,
  requestsPerEmailPerHour: 5,
  requestsPerIpPerHour: 20,
  /** All e-mails sent in 24 hours. The free Resend plan stops at 100 a day; raise this together with the plan. */
  requestsPerDayAll: 90,
  failedChecksPerEmailPerHour: 10,
  failedChecksPerIpPerHour: 30,
  maxActiveDevices: 2,
  lastSeenRefreshMinutes: 10,
} as const;

export type LimitSettings = { [K in keyof typeof LIMITS]: number };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

async function inTransaction<T>(db: Db, run: (trx: Db) => Promise<T>): Promise<T> {
  // A Transaction cannot open another one: tests pass a Transaction in and everything joins it.
  return db.isTransaction ? run(db) : (db as Kysely<Database>).transaction().execute((trx) => run(trx));
}

export type EventKind = "request" | "verify_fail" | "redeem_fail";
export type EventScope = "email" | "ip" | "global" | "account";

export async function countEvents(db: Db, kind: EventKind, scope: EventScope, keyMac: string, since: Date): Promise<number> {
  const row = await db
    .selectFrom("reader_auth_events")
    .select(sql<string>`count(*)`.as("n"))
    .where("kind", "=", kind)
    .where("scope", "=", scope)
    .where("key_mac", "=", keyMac)
    .where("at", ">=", since)
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

export async function recordEvent(db: Db, kind: EventKind, scope: EventScope, keyMac: string, at: Date) {
  await db.insertInto("reader_auth_events").values({ kind, scope, key_mac: keyMac, at }).execute();
}

export type RequestCodeResult = { ok: true } | { ok: false; reason: "invalid_email" | "throttled" | "mail_failed" };

/**
 * "Send me a code." The caller shows the same message whatever the result except `invalid_email`, so nobody can learn whether an
 * address has an account, or whether it was throttled by the address or by the visitor.
 */
export async function requestLoginCode(
  db: Db,
  deps: { key: MacKey; mailer: Mailer; now?: Date; limits?: Partial<LimitSettings> },
  input: { email: string; ipMac: string }
): Promise<RequestCodeResult> {
  const now = deps.now ?? new Date();
  const limits: LimitSettings = { ...LIMITS, ...deps.limits };
  const email = normaliseEmail(input.email);
  if (!email) return { ok: false, reason: "invalid_email" };
  const emailMac = emailLookupMac(deps.key, email);

  const code = generateOtp();
  const challengeId = randomUUID();

  const allowed = await inTransaction(db, async (trx) => {
    // Serialise requests for the same address so two at once cannot both pass the cooldown.
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${emailMac}, 0))`.execute(trx);
    if ((await countEvents(trx, "request", "email", emailMac, new Date(now.getTime() - limits.requestCooldownSeconds * 1000))) > 0) return false;
    if ((await countEvents(trx, "request", "email", emailMac, new Date(now.getTime() - HOUR_MS))) >= limits.requestsPerEmailPerHour) return false;
    if ((await countEvents(trx, "request", "ip", input.ipMac, new Date(now.getTime() - HOUR_MS))) >= limits.requestsPerIpPerHour) return false;
    if ((await countEvents(trx, "request", "global", "all", new Date(now.getTime() - DAY_MS))) >= limits.requestsPerDayAll) return false;

    await recordEvent(trx, "request", "email", emailMac, now);
    await recordEvent(trx, "request", "ip", input.ipMac, now);
    await recordEvent(trx, "request", "global", "all", now);

    // A new request retires the one still open for this address.
    await trx
      .updateTable("reader_auth_challenges")
      .set({ consumed_at: now })
      .where("email_lookup_mac", "=", emailMac)
      .where("purpose", "=", "login")
      .where("consumed_at", "is", null)
      .execute();
    await trx
      .insertInto("reader_auth_challenges")
      .values({
        id: challengeId,
        email_lookup_mac: emailMac,
        otp_mac: otpMac(deps.key, challengeId, code),
        key_id: deps.key.keyId,
        created_at: now,
        expires_at: new Date(now.getTime() + limits.otpTtlMinutes * 60 * 1000),
      })
      .execute();
    return true;
  });
  if (!allowed) return { ok: false, reason: "throttled" };

  try {
    await deps.mailer.sendLoginCode({ to: email, code, ttlMinutes: limits.otpTtlMinutes });
  } catch {
    // The code was never delivered: retire it so it cannot be guessed against, and tell the caller.
    await db.updateTable("reader_auth_challenges").set({ consumed_at: now }).where("id", "=", challengeId).execute();
    return { ok: false, reason: "mail_failed" };
  }
  return { ok: true };
}

export type DeviceSummary = { id: string; label: string; lastSeenAt: Date };
export type VerifyResult =
  | { status: "ok"; token: string; accountId: string; deviceId: string; isNewAccount: boolean; trialEndsAt: Date | null }
  | { status: "choose_device"; devices: DeviceSummary[] }
  | { status: "invalid" }
  | { status: "throttled" };

export async function verifyLoginCode(
  db: Db,
  deps: { key: MacKey; now?: Date; limits?: Partial<LimitSettings> },
  input: { email: string; code: string; ipMac: string; deviceLabel?: string; replaceDeviceId?: string }
): Promise<VerifyResult> {
  const now = deps.now ?? new Date();
  const limits: LimitSettings = { ...LIMITS, ...deps.limits };
  const email = normaliseEmail(input.email);
  const code = normaliseOtpInput(input.code);
  if (!email || !code) return { status: "invalid" };
  const emailMac = emailLookupMac(deps.key, email);
  const hourAgo = new Date(now.getTime() - HOUR_MS);

  return inTransaction(db, async (trx): Promise<VerifyResult> => {
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${emailMac}, 0))`.execute(trx);
    if ((await countEvents(trx, "verify_fail", "email", emailMac, hourAgo)) >= limits.failedChecksPerEmailPerHour) return { status: "throttled" };
    if ((await countEvents(trx, "verify_fail", "ip", input.ipMac, hourAgo)) >= limits.failedChecksPerIpPerHour) return { status: "throttled" };

    const challenge = await trx
      .selectFrom("reader_auth_challenges")
      .selectAll()
      .where("email_lookup_mac", "=", emailMac)
      .where("purpose", "=", "login")
      .where("consumed_at", "is", null)
      .where("expires_at", ">", now)
      .forUpdate()
      .executeTakeFirst();
    if (!challenge) {
      await recordEvent(trx, "verify_fail", "email", emailMac, now);
      await recordEvent(trx, "verify_fail", "ip", input.ipMac, now);
      return { status: "invalid" };
    }

    if (!constantTimeEqualHex(challenge.otp_mac, otpMac(deps.key, challenge.id, code))) {
      const attempts = challenge.attempt_count + 1;
      await trx
        .updateTable("reader_auth_challenges")
        .set({ attempt_count: attempts, consumed_at: attempts >= limits.maxAttemptsPerChallenge ? now : null })
        .where("id", "=", challenge.id)
        .execute();
      await recordEvent(trx, "verify_fail", "email", emailMac, now);
      await recordEvent(trx, "verify_fail", "ip", input.ipMac, now);
      return { status: "invalid" };
    }

    // The code is right. Find or create the account, under a lock so two sign-ins at once cannot both take the last device place.
    let account = await trx
      .selectFrom("reader_accounts")
      .selectAll()
      .where("email_normalized", "=", email)
      .where("status", "<>", "deleted")
      .forUpdate()
      .executeTakeFirst();

    let isNewAccount = false;
    if (!account) {
      // A new account has no access at all until its reader starts the trial (startTrial) or redeems a code.
      account = await trx
        .insertInto("reader_accounts")
        .values({ email: input.email.trim(), email_normalized: email, email_verified_at: now, created_at: now })
        .returningAll()
        .executeTakeFirstOrThrow();
      isNewAccount = true;
    }

    const active = await trx
      .selectFrom("reader_devices")
      .select(["id", "label", "last_seen_at"])
      .where("account_id", "=", account.id)
      .where("revoked_at", "is", null)
      .orderBy("last_seen_at", "desc")
      .execute();

    if (active.length >= limits.maxActiveDevices) {
      if (!input.replaceDeviceId) {
        // Correct code, but both places are taken: nothing is consumed, so the same code can be sent again with the choice.
        return { status: "choose_device", devices: active.map((d) => ({ id: d.id, label: d.label, lastSeenAt: d.last_seen_at })) };
      }
      if (!active.some((d) => d.id === input.replaceDeviceId)) return { status: "invalid" };
      await trx
        .updateTable("reader_devices")
        .set({ revoked_at: now, revoked_reason: "replaced" })
        .where("id", "=", input.replaceDeviceId)
        .where("account_id", "=", account.id)
        .execute();
    }

    // Use the code up. Only one of two simultaneous requests can win this update.
    const used = await trx
      .updateTable("reader_auth_challenges")
      .set({ consumed_at: now })
      .where("id", "=", challenge.id)
      .where("consumed_at", "is", null)
      .returning("id")
      .executeTakeFirst();
    if (!used) return { status: "invalid" };

    const token = generateSessionToken();
    const label = (input.deviceLabel ?? "").trim().slice(0, 60) || "Peranti";
    const device = await trx
      .insertInto("reader_devices")
      .values({ account_id: account.id, token_hash: hashSessionToken(token), label, created_at: now, last_seen_at: now })
      .returning("id")
      .executeTakeFirstOrThrow();
    await trx.updateTable("reader_accounts").set({ last_login_at: now }).where("id", "=", account.id).execute();

    return { status: "ok", token, accountId: account.id, deviceId: device.id, isNewAccount, trialEndsAt: account.trial_ends_at };
  });
}

export type StartTrialResult =
  | { status: "ok"; startsAt: Date; endsAt: Date }
  | { status: "already"; startsAt: Date | null; endsAt: Date | null }
  | { status: "used" }
  | { status: "no_account" };

/**
 * Start the 14-day trial of this account, when its reader chooses to. Given once per address, for good: the claim is kept as a keyed
 * hash that survives deleting the account, so signing up again with the same address does not give a second trial. The account row
 * is locked, so two presses at once give one trial.
 */
export async function startTrial(db: Db, deps: { key: MacKey; now?: Date }, accountId: string): Promise<StartTrialResult> {
  const now = deps.now ?? new Date();
  return inTransaction(db, async (trx): Promise<StartTrialResult> => {
    const account = await trx.selectFrom("reader_accounts").selectAll().where("id", "=", accountId).where("status", "<>", "deleted").forUpdate().executeTakeFirst();
    if (!account) return { status: "no_account" };
    if (account.trial_starts_at) return { status: "already", startsAt: account.trial_starts_at, endsAt: account.trial_ends_at };
    const claim = await trx
      .insertInto("reader_trial_claims")
      .values({ email_mac: trialClaimMac(deps.key, account.email_normalized), key_id: deps.key.keyId, claimed_at: now })
      .onConflict((oc) => oc.column("email_mac").doNothing())
      .returning("email_mac")
      .executeTakeFirst();
    if (!claim) return { status: "used" };
    const endsAt = new Date(now.getTime() + TRIAL_DAYS * DAY_MS);
    await trx.updateTable("reader_accounts").set({ trial_starts_at: now, trial_ends_at: endsAt }).where("id", "=", accountId).execute();
    await addTrial(trx, accountId, now, endsAt);
    return { status: "ok", startsAt: now, endsAt };
  });
}

/** Whether the trial can still be started from this account (never started on it, and not already taken by this address). */
export async function canStartTrial(db: Db, deps: { key: MacKey }, accountId: string): Promise<boolean> {
  const account = await db.selectFrom("reader_accounts").select(["trial_starts_at", "email_normalized"]).where("id", "=", accountId).where("status", "<>", "deleted").executeTakeFirst();
  if (!account || account.trial_starts_at) return false;
  const claim = await db.selectFrom("reader_trial_claims").select("email_mac").where("email_mac", "=", trialClaimMac(deps.key, account.email_normalized)).executeTakeFirst();
  return !claim;
}

export type SessionInfo = {
  account: { id: string; email: string; displayName: string | null; trialStartsAt: Date | null; trialEndsAt: Date | null };
  device: { id: string; label: string };
};

/** Who the cookie belongs to, or null. Touches last-seen at most every ten minutes so reading does not write on every page. */
export async function getSession(db: Db, token: string, now: Date = new Date()): Promise<SessionInfo | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const row = await db
    .selectFrom("reader_devices as d")
    .innerJoin("reader_accounts as a", "a.id", "d.account_id")
    .select(["d.id as device_id", "d.label", "d.last_seen_at", "a.id as account_id", "a.email", "a.display_name", "a.trial_starts_at", "a.trial_ends_at"])
    .where("d.token_hash", "=", hashSessionToken(token))
    .where("d.revoked_at", "is", null)
    .where("a.status", "<>", "deleted")
    .executeTakeFirst();
  if (!row) return null;
  if (now.getTime() - row.last_seen_at.getTime() > LIMITS.lastSeenRefreshMinutes * 60 * 1000) {
    await db.updateTable("reader_devices").set({ last_seen_at: now }).where("id", "=", row.device_id).execute();
  }
  return {
    account: { id: row.account_id, email: row.email, displayName: row.display_name, trialStartsAt: row.trial_starts_at, trialEndsAt: row.trial_ends_at },
    device: { id: row.device_id, label: row.label },
  };
}

export async function signOut(db: Db, token: string, now: Date = new Date()): Promise<void> {
  await db
    .updateTable("reader_devices")
    .set({ revoked_at: now, revoked_reason: "signed_out" })
    .where("token_hash", "=", hashSessionToken(token))
    .where("revoked_at", "is", null)
    .execute();
}

export async function signOutEverywhere(db: Db, accountId: string, now: Date = new Date()): Promise<void> {
  await db
    .updateTable("reader_devices")
    .set({ revoked_at: now, revoked_reason: "sign_out_all" })
    .where("account_id", "=", accountId)
    .where("revoked_at", "is", null)
    .execute();
}

/**
 * The reader deletes their own account. The address and name are removed at once (the row stays only as an anonymous anchor for the
 * append-only ledger of access and redemptions), every device is signed out, and settings, saved works and reading places are deleted.
 * The one-trial-per-address claim is kept as a keyed hash, so deleting and registering again does not give a second trial.
 * Remaining access is not refunded or moved: it goes with the account.
 */
export async function deleteAccount(db: Db, accountId: string, now: Date = new Date()): Promise<boolean> {
  return inTransaction(db, async (trx) => {
    const account = await trx.selectFrom("reader_accounts").select("id").where("id", "=", accountId).where("status", "<>", "deleted").forUpdate().executeTakeFirst();
    if (!account) return false;
    const placeholder = "padam-" + accountId + "@padam.invalid";
    await trx
      .updateTable("reader_accounts")
      .set({ status: "deleted", email: placeholder, email_normalized: placeholder, display_name: null, deletion_requested_at: now })
      .where("id", "=", accountId)
      .execute();
    await trx.updateTable("reader_devices").set({ revoked_at: now, revoked_reason: "account_deleted" }).where("account_id", "=", accountId).where("revoked_at", "is", null).execute();
    await trx.deleteFrom("reader_prefs").where("account_id", "=", accountId).execute();
    await trx.deleteFrom("saved_works").where("account_id", "=", accountId).execute();
    await trx.deleteFrom("reading_progress").where("account_id", "=", accountId).execute();
    return true;
  });
}

export async function listDevices(db: Db, accountId: string): Promise<DeviceSummary[]> {
  const rows = await db
    .selectFrom("reader_devices")
    .select(["id", "label", "last_seen_at"])
    .where("account_id", "=", accountId)
    .where("revoked_at", "is", null)
    .orderBy("last_seen_at", "desc")
    .execute();
  return rows.map((r) => ({ id: r.id, label: r.label, lastSeenAt: r.last_seen_at }));
}

/** Remove one of the account's own devices (it is signed out at once). Returns false if it is not an active device of this account. */
export async function revokeDevice(db: Db, accountId: string, deviceId: string, now: Date = new Date()): Promise<boolean> {
  const revoked = await db
    .updateTable("reader_devices")
    .set({ revoked_at: now, revoked_reason: "signed_out" })
    .where("id", "=", deviceId)
    .where("account_id", "=", accountId)
    .where("revoked_at", "is", null)
    .returning("id")
    .executeTakeFirst();
  return !!revoked;
}

export async function setDisplayName(db: Db, accountId: string, name: string): Promise<string | null> {
  const clean = name.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 60);
  await db.updateTable("reader_accounts").set({ display_name: clean || null }).where("id", "=", accountId).execute();
  return clean || null;
}

export const PREF_CHOICES = {
  fontSizePx: [16, 18, 20, 22, 24],
  lineHeightX100: [150, 175, 200],
  textWidthCh: [60, 68, 74],
  theme: ["cerah", "sepia", "gelap"],
  fontFamily: ["serif", "sans"],
  dimPercent: [0, 5, 10, 15, 20],
} as const;

export type ReaderPrefs = {
  fontSizePx: number;
  lineHeightX100: number;
  textWidthCh: number;
  theme: "cerah" | "sepia" | "gelap";
  fontFamily: "serif" | "sans";
  dimPercent: number;
};

export const DEFAULT_PREFS: ReaderPrefs = { fontSizePx: 18, lineHeightX100: 175, textWidthCh: 68, theme: "cerah", fontFamily: "serif", dimPercent: 0 };

export async function getPrefs(db: Db, accountId: string): Promise<ReaderPrefs> {
  const row = await db.selectFrom("reader_prefs").selectAll().where("account_id", "=", accountId).executeTakeFirst();
  if (!row) return { ...DEFAULT_PREFS };
  return {
    fontSizePx: row.font_size_px,
    lineHeightX100: row.line_height_x100,
    textWidthCh: row.text_width_ch,
    theme: row.theme,
    fontFamily: row.font_family,
    dimPercent: row.dim_percent,
  };
}

/** Takes whatever the browser sent and keeps only values that are on offer; anything else is ignored, never stored. Returns the saved preferences. */
export async function setPrefs(db: Db, accountId: string, input: Record<string, unknown>, now: Date = new Date()): Promise<ReaderPrefs> {
  const current = await getPrefs(db, accountId);
  const pick = <T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
  const next: ReaderPrefs = {
    fontSizePx: pick(input.fontSizePx, PREF_CHOICES.fontSizePx, current.fontSizePx),
    lineHeightX100: pick(input.lineHeightX100, PREF_CHOICES.lineHeightX100, current.lineHeightX100),
    textWidthCh: pick(input.textWidthCh, PREF_CHOICES.textWidthCh, current.textWidthCh),
    theme: pick(input.theme, PREF_CHOICES.theme, current.theme),
    fontFamily: pick(input.fontFamily, PREF_CHOICES.fontFamily, current.fontFamily),
    dimPercent: pick(input.dimPercent, PREF_CHOICES.dimPercent, current.dimPercent),
  };
  await db
    .insertInto("reader_prefs")
    .values({
      account_id: accountId,
      font_size_px: next.fontSizePx,
      line_height_x100: next.lineHeightX100,
      text_width_ch: next.textWidthCh,
      theme: next.theme,
      font_family: next.fontFamily,
      dim_percent: next.dimPercent,
      updated_at: now,
    })
    .onConflict((oc) =>
      oc.column("account_id").doUpdateSet({
        font_size_px: next.fontSizePx,
        line_height_x100: next.lineHeightX100,
        text_width_ch: next.textWidthCh,
        theme: next.theme,
        font_family: next.fontFamily,
        dim_percent: next.dimPercent,
        updated_at: now,
      })
    )
    .execute();
  return next;
}
