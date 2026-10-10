/**
 * Redeeming codes (study sections 5.6 to 5.8, 14 to 18, 24). Card codes and shared codes both end up as a period in the access ledger.
 *
 * What is kept, and what is not: a card code is NEVER stored. Only a keyed hash of (batch number, code) is, so a copy of the database
 * cannot be turned into working codes without the key. The plain codes exist in memory once, when a batch is made, to be printed.
 *
 * One transaction does the whole redemption: it locks the reader, finds the code, checks every rule, adds the period and writes the
 * redemption. `redemptions.code_id` is UNIQUE, so even two requests that slip past every check cannot both succeed. There is no
 * "is this code valid" lookup apart from redeeming itself, and every failure gives the same answer, so a guess learns nothing.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { Database } from "../db/types";
import { computeCodeMac, formatCode, generateCanonicalCode, normaliseBatch, normaliseCodeInput } from "../subscription/redeem-code";
import { evaluateSharedRedemption, generateSharedCode, isValidSharedGrant, normaliseSharedCodeInput, type SharedGrant } from "../subscription/shared-code";
import { addGrant, getAccess } from "./entitlements";
import { countEvents, recordEvent, type Db } from "./service";
import type { MacKey } from "./primitives";

export const REDEEM_LIMITS = {
  failsPerAccountPer15Min: 5,
  failsPerIpPerHour: 20,
  failsAllPerHour: 200,
} as const;
export type RedeemLimitSettings = { [K in keyof typeof REDEEM_LIMITS]: number };

const MIN15 = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function inTransaction<T>(db: Db, run: (trx: Db) => Promise<T>): Promise<T> {
  return db.isTransaction ? run(db) : (db as Kysely<Database>).transaction().execute((trx) => run(trx));
}

// ------------------------------------------------------------------ the stop switch

export async function isRedeemHalted(db: Db): Promise<boolean> {
  const row = await db.selectFrom("reader_switches").select("value").where("key", "=", "redeem_halted").executeTakeFirst();
  return row?.value === "yes";
}

export async function setRedeemHalted(db: Db, halted: boolean, by: string, now: Date = new Date()): Promise<void> {
  await db
    .insertInto("reader_switches")
    .values({ key: "redeem_halted", value: halted ? "yes" : "no", updated_at: now, updated_by: by })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: halted ? "yes" : "no", updated_at: now, updated_by: by }))
    .execute();
}

// ------------------------------------------------------------------ batches of card codes

export type MadeCode = { serial: string; code: string; canonical: string };
export type MadeBatch = { batchId: string; batchNumber: string; months: 1 | 6 | 12; codes: MadeCode[] };

/**
 * Make a batch of card codes. Returns the plain codes ONCE so they can be printed; only their keyed hashes are saved. The batch starts
 * as PENDING_PRINT and its codes as "generated": nothing can be redeemed until the print is confirmed and the codes are issued.
 */
export async function createBatch(
  db: Db,
  deps: { codeKey: MacKey; now?: Date },
  input: { batchNumber: string; months: 1 | 6 | 12; quantity: number; orderRef?: string; note?: string; createdBy?: string }
): Promise<MadeBatch> {
  const now = deps.now ?? new Date();
  const batchNumber = normaliseBatch(input.batchNumber);
  if (!batchNumber) throw new Error("Invalid batch number.");
  if (![1, 6, 12].includes(input.months)) throw new Error("A card is for 1, 6 or 12 months.");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 5000) throw new Error("A batch is 1 to 5000 cards.");

  return inTransaction(db, async (trx) => {
    const batch = await trx
      .insertInto("code_batches")
      .values({ batch_number: batchNumber, months: input.months, quantity: input.quantity, order_ref: input.orderRef ?? null, note: input.note ?? null, key_id: deps.codeKey.keyId, created_by: input.createdBy ?? null, created_at: now })
      .returning("id")
      .executeTakeFirstOrThrow();
    const seqs = await sql<{ n: string }>`SELECT nextval('redeem_serial_seq') AS n FROM generate_series(1, ${input.quantity})`.execute(trx);
    const yy = String(now.getUTCFullYear()).slice(2);
    const codes: MadeCode[] = [];
    const rows = seqs.rows.map((r) => {
      const canonical = generateCanonicalCode();
      const serial = `JLN-${yy}-${String(r.n).padStart(6, "0")}`;
      codes.push({ serial, code: formatCode(canonical), canonical });
      return { batch_id: batch.id, serial, code_mac: computeCodeMac(deps.codeKey.key, batchNumber, canonical), key_id: deps.codeKey.keyId, created_at: now };
    });
    for (let i = 0; i < rows.length; i += 500) await trx.insertInto("redeem_codes").values(rows.slice(i, i + 500)).execute();
    return { batchId: batch.id, batchNumber, months: input.months, codes };
  });
}

/** The print came out right. Only now can the batch's codes be issued. */
export async function confirmBatchPrinted(db: Db, batchId: string, now: Date = new Date()): Promise<boolean> {
  const row = await db.updateTable("code_batches").set({ status: "PRINT_CONFIRMED", confirmed_at: now }).where("id", "=", batchId).where("status", "=", "PENDING_PRINT").returning("id").executeTakeFirst();
  return !!row;
}

/** A print that went wrong: the batch and all its codes are dead and never redeemable. */
export async function voidBatch(db: Db, batchId: string, reason: string, now: Date = new Date()): Promise<boolean> {
  if (!reason.trim()) throw new Error("A reason is required.");
  return inTransaction(db, async (trx) => {
    const row = await trx.updateTable("code_batches").set({ status: "VOIDED", voided_at: now, void_reason: reason.trim() }).where("id", "=", batchId).where("status", "<>", "VOIDED").returning("id").executeTakeFirst();
    if (!row) return false;
    await trx.updateTable("redeem_codes").set({ state: "revoked", revoked_at: now, revoke_reason: `Kelompok dibatalkan: ${reason.trim()}` }).where("batch_id", "=", batchId).where("state", "<>", "revoked").execute();
    return true;
  });
}

/** Switch codes on, as the cards leave the building. Only codes of a confirmed batch can be issued; by batch, or by serial numbers. */
export async function issueCodes(db: Db, target: { batchId: string } | { serials: string[] }, now: Date = new Date()): Promise<number> {
  let query = db
    .updateTable("redeem_codes")
    .set({ state: "issued", issued_at: now })
    .where("state", "=", "generated")
    .where("batch_id", "in", (eb) => eb.selectFrom("code_batches").select("id").where("status", "=", "PRINT_CONFIRMED"));
  query = "batchId" in target ? query.where("batch_id", "=", target.batchId) : query.where("serial", "in", target.serials.length ? target.serials : ["-"]);
  const result = await query.executeTakeFirst();
  return Number(result.numUpdatedRows);
}

/** Cancel one code (a lost or stolen card). If it has already been redeemed this changes nothing: that access stands until Izzat cancels it. */
export async function revokeCode(db: Db, serial: string, reason: string, now: Date = new Date()): Promise<boolean> {
  if (!reason.trim()) throw new Error("A reason is required.");
  const row = await db.updateTable("redeem_codes").set({ state: "revoked", revoked_at: now, revoke_reason: reason.trim() }).where("serial", "=", serial).where("state", "<>", "revoked").returning("id").executeTakeFirst();
  return !!row;
}

/**
 * Cancel many cards at once, but only those that have NOT been redeemed (a redeemed card's access is cancelled on the reader's page, not
 * here). Returns the serials that were cancelled and the ones skipped, so the admin sees exactly what happened.
 */
export async function revokeUnredeemedCodes(db: Db, serials: string[], reason: string, now: Date = new Date()): Promise<{ revoked: string[]; skipped: { serial: string; why: "redeemed" | "already_revoked" | "not_found" }[] }> {
  const why = reason.trim();
  if (!why) throw new Error("A reason is required.");
  const wanted = [...new Set(serials.map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, 5000);
  if (wanted.length === 0) return { revoked: [], skipped: [] };
  return inTransaction(db, async (trx) => {
    const rows = await trx
      .selectFrom("redeem_codes as c")
      .leftJoin("redemptions as r", "r.code_id", "c.id")
      .select(["c.id", "c.serial", "c.state", "r.id as redemption"])
      .where("c.serial", "in", wanted)
      .forUpdate("c")
      .execute();
    const bySerial = new Map(rows.map((r) => [r.serial, r]));
    const revoked: string[] = [];
    const skipped: { serial: string; why: "redeemed" | "already_revoked" | "not_found" }[] = [];
    for (const serial of wanted) {
      const row = bySerial.get(serial);
      if (!row) { skipped.push({ serial, why: "not_found" }); continue; }
      if (row.redemption) { skipped.push({ serial, why: "redeemed" }); continue; }
      if (row.state === "revoked") { skipped.push({ serial, why: "already_revoked" }); continue; }
      await trx.updateTable("redeem_codes").set({ state: "revoked", revoked_at: now, revoke_reason: why }).where("id", "=", row.id).execute();
      revoked.push(serial);
    }
    return { revoked, skipped };
  });
}

export type ReplacedCode = { oldSerial: string; serial: string; code: string; canonical: string; batchNumber: string; months: 1 | 6 | 12 };

/**
 * Replace a card that has not been redeemed (lost in the post, damaged before use): the old code is cancelled and a new one is made in
 * the same batch, so the batch number printed on the card stays right. The new code starts in the state the old one had (issued if it was
 * issued), so the new label can be stuck on and the card sent. The plain code is returned once, to be printed; it is not stored.
 */
export async function replaceCode(db: Db, deps: { codeKey: MacKey; now?: Date }, input: { serial: string; reason: string }): Promise<ReplacedCode> {
  const now = deps.now ?? new Date();
  const reason = input.reason.trim();
  if (!reason) throw new Error("A reason is required.");
  const oldSerial = input.serial.trim().toUpperCase();
  return inTransaction(db, async (trx) => {
    const old = await trx
      .selectFrom("redeem_codes as c")
      .innerJoin("code_batches as b", "b.id", "c.batch_id")
      .leftJoin("redemptions as r", "r.code_id", "c.id")
      .select(["c.id", "c.state", "c.batch_id", "b.batch_number", "b.months", "b.status as batch_status", "b.quantity", "r.id as redemption"])
      .where("c.serial", "=", oldSerial)
      .forUpdate("c")
      .executeTakeFirst();
    if (!old) throw new Error("Unknown serial number.");
    if (old.redemption) throw new Error("A card that has been redeemed cannot be replaced.");
    if (old.state === "revoked") throw new Error("A cancelled card cannot be replaced.");
    if (old.batch_status !== "PRINT_CONFIRMED") throw new Error("Only a card of a batch whose print is confirmed can be replaced.");
    if (old.quantity >= 5000) throw new Error("A batch is 1 to 5000 cards.");
    const seq = await sql<{ n: string }>`SELECT nextval('redeem_serial_seq') AS n`.execute(trx);
    const serial = `JLN-${String(now.getUTCFullYear()).slice(2)}-${String(seq.rows[0].n).padStart(6, "0")}`;
    const canonical = generateCanonicalCode();
    await trx
      .insertInto("redeem_codes")
      .values({ batch_id: old.batch_id, serial, code_mac: computeCodeMac(deps.codeKey.key, old.batch_number, canonical), key_id: deps.codeKey.keyId, state: old.state, issued_at: old.state === "issued" ? now : null, created_at: now })
      .execute();
    await trx.updateTable("redeem_codes").set({ state: "revoked", revoked_at: now, revoke_reason: `Diganti dengan ${serial}: ${reason}` }).where("id", "=", old.id).execute();
    await trx.updateTable("code_batches").set({ quantity: old.quantity + 1 }).where("id", "=", old.batch_id).execute();
    return { oldSerial, serial, code: formatCode(canonical), canonical, batchNumber: old.batch_number, months: old.months as 1 | 6 | 12 };
  });
}

// ------------------------------------------------------------------ shared codes

export async function createSharedCode(
  db: Db,
  input: { grant: SharedGrant; maxRedemptions: number; expiresAt?: Date | null; channel?: string; note?: string; createdBy?: string; now?: Date }
): Promise<{ id: string; code: string }> {
  if (!isValidSharedGrant(input.grant)) throw new Error("Unknown grant length.");
  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1 || input.maxRedemptions > 100000) throw new Error("The limit is 1 to 100000.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSharedCode();
    try {
      const row = await db
        .insertInto("shared_codes")
        .values({ code, grant_unit: input.grant.unit, grant_amount: input.grant.amount, max_redemptions: input.maxRedemptions, expires_at: input.expiresAt ?? null, channel: input.channel ?? null, note: input.note ?? null, created_by: input.createdBy ?? null, created_at: input.now ?? new Date() })
        .returning(["id", "code"])
        .executeTakeFirstOrThrow();
      return row;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  throw new Error("Could not make a unique shared code.");
}

export async function setSharedCodeStatus(db: Db, id: string, status: "active" | "paused" | "revoked"): Promise<boolean> {
  const row = await db.updateTable("shared_codes").set({ status }).where("id", "=", id).returning("id").executeTakeFirst();
  return !!row;
}

// ------------------------------------------------------------------ redeeming

export type RedeemResult =
  | { status: "ok"; kind: "card" | "shared"; startsAt: Date; endsAt: Date; accessEndsAt: Date | null; repeat?: boolean }
  | { status: "invalid" }
  | { status: "already" }
  | { status: "throttled" }
  | { status: "halted" };

type Deps = { codeKey: MacKey; previousCodeKeys?: MacKey[]; now?: Date; limits?: Partial<RedeemLimitSettings> };
type Input = { accountId: string; ipMac: string; code: string; batch?: string };

async function fail(trx: Db, accountId: string, ipMac: string, now: Date): Promise<RedeemResult> {
  await recordEvent(trx, "redeem_fail", "account", accountId, now);
  await recordEvent(trx, "redeem_fail", "ip", ipMac, now);
  await recordEvent(trx, "redeem_fail", "global", "all", now);
  return { status: "invalid" };
}

export async function redeemCode(db: Db, deps: Deps, input: Input): Promise<RedeemResult> {
  const now = deps.now ?? new Date();
  const limits: RedeemLimitSettings = { ...REDEEM_LIMITS, ...deps.limits };

  if (await isRedeemHalted(db)) return { status: "halted" };

  return inTransaction(db, async (trx): Promise<RedeemResult> => {
    // Serialise one reader's attempts so two at once cannot both slip under the limit.
    const account = await trx.selectFrom("reader_accounts").select("id").where("id", "=", input.accountId).where("status", "<>", "deleted").forUpdate().executeTakeFirst();
    if (!account) return { status: "invalid" };

    if ((await countEvents(trx, "redeem_fail", "account", input.accountId, new Date(now.getTime() - MIN15))) >= limits.failsPerAccountPer15Min) return { status: "throttled" };
    if ((await countEvents(trx, "redeem_fail", "ip", input.ipMac, new Date(now.getTime() - HOUR))) >= limits.failsPerIpPerHour) return { status: "throttled" };
    if ((await countEvents(trx, "redeem_fail", "global", "all", new Date(now.getTime() - HOUR))) >= limits.failsAllPerHour) return { status: "throttled" };

    const sharedCode = normaliseSharedCodeInput(input.code);
    return sharedCode ? redeemShared(trx, deps, input, sharedCode, now) : redeemCard(trx, deps, input, now);
  });
}

async function redeemCard(trx: Db, deps: Deps, input: Input, now: Date): Promise<RedeemResult> {
  const parsed = normaliseCodeInput(input.code);
  const batch = normaliseBatch(input.batch ?? "");
  if (!parsed.ok || !batch) return fail(trx, input.accountId, input.ipMac, now);

  let code: { id: string; state: "generated" | "issued" | "revoked"; serial: string; months: number; batch_status: "PENDING_PRINT" | "PRINT_CONFIRMED" | "VOIDED" } | undefined;
  for (const key of [deps.codeKey, ...(deps.previousCodeKeys ?? [])]) {
    const mac = computeCodeMac(key.key, batch, parsed.canonical);
    code = await trx
      .selectFrom("redeem_codes as c")
      .innerJoin("code_batches as b", "b.id", "c.batch_id")
      .select(["c.id", "c.state", "c.serial", "b.months", "b.status as batch_status"])
      .where("c.key_id", "=", key.keyId)
      .where("c.code_mac", "=", mac)
      .forUpdate("c")
      .executeTakeFirst();
    if (code) break;
  }
  if (!code || code.state !== "issued" || code.batch_status !== "PRINT_CONFIRMED") {
    // A code that was issued and used is told apart only for the reader who used it (below); everyone else sees the same refusal.
    if (code) {
      const mine = await trx.selectFrom("redemptions").select(["entitlement_id", "account_id"]).where("code_id", "=", code.id).executeTakeFirst();
      if (mine && mine.account_id === input.accountId) return repeatOfCard(trx, input.accountId, mine.entitlement_id, now);
    }
    return fail(trx, input.accountId, input.ipMac, now);
  }

  const used = await trx.selectFrom("redemptions").select(["entitlement_id", "account_id"]).where("code_id", "=", code.id).executeTakeFirst();
  if (used) {
    return used.account_id === input.accountId ? repeatOfCard(trx, input.accountId, used.entitlement_id, now) : fail(trx, input.accountId, input.ipMac, now);
  }

  const months = code.months as 1 | 6 | 12;
  const grant = await addGrant(trx, { accountId: input.accountId, kind: "CARD", grant: { unit: "months", amount: months }, sourceRef: code.id, reason: `Kad ${code.serial}`, createdBy: "tebus", now });
  if (!grant.added) return fail(trx, input.accountId, input.ipMac, now);
  await trx.insertInto("redemptions").values({ code_id: code.id, account_id: input.accountId, entitlement_id: grant.id, redeemed_at: now }).execute();
  const access = await getAccess(trx, input.accountId, now);
  return { status: "ok", kind: "card", startsAt: grant.startsAt, endsAt: grant.endsAt, accessEndsAt: access.endsAt };
}

async function repeatOfCard(trx: Db, accountId: string, entitlementId: string, now: Date): Promise<RedeemResult> {
  const row = await trx.selectFrom("entitlements").select(["starts_at", "ends_at"]).where("id", "=", entitlementId).executeTakeFirstOrThrow();
  const access = await getAccess(trx, accountId, now);
  return { status: "ok", kind: "card", startsAt: row.starts_at, endsAt: row.ends_at, accessEndsAt: access.endsAt, repeat: true };
}

async function redeemShared(trx: Db, _deps: Deps, input: Input, canonical: string, now: Date): Promise<RedeemResult> {
  const row = await trx.selectFrom("shared_codes").selectAll().where("code", "=", canonical).forUpdate().executeTakeFirst();
  if (!row) return fail(trx, input.accountId, input.ipMac, now);
  const mine = await trx.selectFrom("shared_redemptions").select("id").where("shared_code_id", "=", row.id).where("account_id", "=", input.accountId).executeTakeFirst();
  const decision = evaluateSharedRedemption({ status: row.status, redeemedCount: row.redeemed_count, maxRedemptions: row.max_redemptions, expiresAt: row.expires_at }, now, !!mine);
  if (!decision.ok) {
    if (decision.reason === "already_redeemed") return { status: "already" };
    return fail(trx, input.accountId, input.ipMac, now);
  }
  // The count goes up only while every rule still holds: the last place cannot be taken twice.
  const counted = await trx
    .updateTable("shared_codes")
    .set({ redeemed_count: sql<number>`redeemed_count + 1` })
    .where("id", "=", row.id)
    .where("status", "=", "active")
    .where("redeemed_count", "<", row.max_redemptions)
    .returning("id")
    .executeTakeFirst();
  if (!counted) return fail(trx, input.accountId, input.ipMac, now);
  const grant: SharedGrant = row.grant_unit === "days" ? { unit: "days", amount: row.grant_amount as 7 | 14 } : { unit: "months", amount: row.grant_amount as 1 | 6 | 12 };
  const added = await addGrant(trx, { accountId: input.accountId, kind: "SHARED", grant, sourceRef: `${row.id}:${input.accountId}`, reason: `Kod kongsi ${row.channel ?? ""}`.trim(), createdBy: "tebus", now });
  if (!added.added) return { status: "already" };
  await trx.insertInto("shared_redemptions").values({ shared_code_id: row.id, account_id: input.accountId, entitlement_id: added.id, redeemed_at: now }).execute();
  const access = await getAccess(trx, input.accountId, now);
  return { status: "ok", kind: "shared", startsAt: added.startsAt, endsAt: added.endsAt, accessEndsAt: access.endsAt };
}
