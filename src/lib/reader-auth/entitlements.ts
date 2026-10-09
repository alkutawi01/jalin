/**
 * The access ledger in the database (table `entitlements`, migration 029). Every period of access a reader has is a row here and
 * nothing else decides what they may read: see subscription/access.ts for the rules. Rows are never edited or removed (a trigger
 * enforces it); a mistake is cancelled with a reason and, if needed, a new grant is added.
 */
import { sql } from "kysely";
import { randomUUID } from "node:crypto";
import type { Db } from "./service";
import { stackStart, summariseAccess, type AccessPeriod, type AccessSummary, type EntitlementKind } from "../subscription/access";
import { sharedGrantPeriod, type SharedGrant } from "../subscription/shared-code";

async function inTransaction<T>(db: Db, run: (trx: Db) => Promise<T>): Promise<T> {
  return db.isTransaction ? run(db) : (db as import("kysely").Kysely<import("../db/types").Database>).transaction().execute((trx) => run(trx));
}

export type LedgerRow = AccessPeriod & { id: string; reason: string | null; sourceRef: string | null; createdBy: string | null; revokeReason: string | null };

export async function listLedger(db: Db, accountId: string): Promise<LedgerRow[]> {
  const rows = await db.selectFrom("entitlements").selectAll().where("account_id", "=", accountId).orderBy("starts_at", "asc").orderBy("created_at", "asc").execute();
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    revokedAt: r.revoked_at,
    reason: r.reason,
    sourceRef: r.source_ref,
    createdBy: r.created_by,
    revokeReason: r.revoke_reason,
  }));
}

export async function getAccess(db: Db, accountId: string, now: Date = new Date()): Promise<AccessSummary> {
  return summariseAccess(await listLedger(db, accountId), now);
}

/** The trial, given once when the account is made. Its own source reference is the account, so it can never be added twice. */
export async function addTrial(db: Db, accountId: string, startsAt: Date, endsAt: Date): Promise<void> {
  await db
    .insertInto("entitlements")
    .values({ account_id: accountId, kind: "TRIAL", starts_at: startsAt, ends_at: endsAt, source_ref: accountId, reason: "Percubaan percuma 14 hari", created_by: "system", created_at: startsAt })
    .onConflict((oc) => oc.columns(["kind", "source_ref"]).where("source_ref", "is not", null).doNothing())
    .execute();
}

export type AddGrantResult = { added: true; id: string; startsAt: Date; endsAt: Date } | { added: false; reason: "duplicate"; id: string } | { added: false; reason: "no_account" };

/**
 * Give access of a set length, starting when the access the reader already has ends (the trial included), so nothing already given is
 * lost. `sourceRef` makes it safe to repeat: the same redemption or shared-code use cannot add a second period. The account row is
 * locked meanwhile, so two grants at once are placed one after the other and never overlap by mistake.
 */
export async function addGrant(
  db: Db,
  input: { accountId: string; kind: Exclude<EntitlementKind, "TRIAL">; grant: SharedGrant; sourceRef?: string; reason?: string; createdBy?: string; now?: Date }
): Promise<AddGrantResult> {
  const now = input.now ?? new Date();
  return inTransaction(db, async (trx) => {
    const account = await trx.selectFrom("reader_accounts").select("id").where("id", "=", input.accountId).where("status", "<>", "deleted").forUpdate().executeTakeFirst();
    if (!account) return { added: false, reason: "no_account" } as const;
    if (input.sourceRef) {
      const existing = await trx.selectFrom("entitlements").select("id").where("kind", "=", input.kind).where("source_ref", "=", input.sourceRef).executeTakeFirst();
      if (existing) return { added: false, reason: "duplicate", id: existing.id } as const;
    }
    const start = stackStart(await listLedger(trx, input.accountId), now);
    const { startsAt, endsAt } = sharedGrantPeriod(start, null, input.grant);
    const id = randomUUID();
    await trx
      .insertInto("entitlements")
      .values({ id, account_id: input.accountId, kind: input.kind, starts_at: startsAt, ends_at: endsAt, source_ref: input.sourceRef ?? null, reason: input.reason ?? null, created_by: input.createdBy ?? null, created_at: now })
      .execute();
    return { added: true, id, startsAt, endsAt } as const;
  });
}

/**
 * Cancel one period (a wrong grant, a refund). It gives no access afterwards. The periods after it are NOT moved earlier: a gap, if
 * there is one, is repaired by an explicit new grant, never by a calculation nobody can see.
 */
export async function revokeGrant(db: Db, entitlementId: string, by: string, reason: string, now: Date = new Date()): Promise<boolean> {
  const why = reason.trim();
  if (!why) throw new Error("A reason is required to cancel access.");
  const row = await db
    .updateTable("entitlements")
    .set({ revoked_at: now, revoked_by: by, revoke_reason: why })
    .where("id", "=", entitlementId)
    .where("revoked_at", "is", null)
    .returning("id")
    .executeTakeFirst();
  return !!row;
}

/** Rebuild what the ledger says for an account from the raw rows, bypassing every helper above (used to check them). */
export async function rawLedgerSummary(db: Db, accountId: string, now: Date): Promise<AccessSummary> {
  const res = await sql<{ kind: EntitlementKind; starts_at: Date; ends_at: Date; revoked_at: Date | null }>`
    SELECT kind, starts_at, ends_at, revoked_at FROM entitlements WHERE account_id = ${accountId}`.execute(db);
  return summariseAccess(res.rows.map((r) => ({ kind: r.kind, startsAt: r.starts_at, endsAt: r.ends_at, revokedAt: r.revoked_at })), now);
}
