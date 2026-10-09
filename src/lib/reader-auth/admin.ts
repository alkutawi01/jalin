/**
 * What the Langganan pages of the admin read from the database: overview, batches, shared codes, and a reader's access. Reading only;
 * the changes go through redeem.ts and entitlements.ts. The plain codes of a card are never here: they are not stored.
 */
import { sql } from "kysely";
import { getAccess, listLedger, type LedgerRow } from "./entitlements";
import { isRedeemHalted } from "./redeem";
import type { Db } from "./service";
import type { AccessSummary } from "../subscription/access";

export type Overview = {
  halted: boolean;
  accounts: number;
  inTrial: number;
  subscribed: number;
  batches: { pending: number; confirmed: number; voided: number };
  codes: { generated: number; issued: number; revoked: number; redeemed: number };
  shared: { active: number; paused: number; revoked: number; redemptions: number };
};

const n = (value: unknown) => Number(value ?? 0);

export async function overview(db: Db, now: Date = new Date()): Promise<Overview> {
  const [accounts, access, batches, codes, redeemed, shared, sharedUse, halted] = await Promise.all([
    sql<{ n: string }>`SELECT count(*) AS n FROM reader_accounts WHERE status <> 'deleted'`.execute(db),
    sql<{ paid: string; trial: string }>`
      SELECT count(DISTINCT account_id) FILTER (WHERE kind <> 'TRIAL') AS paid,
             count(DISTINCT account_id) FILTER (WHERE kind = 'TRIAL' AND account_id NOT IN (
               SELECT account_id FROM entitlements WHERE kind <> 'TRIAL' AND revoked_at IS NULL AND starts_at <= ${now} AND ends_at > ${now} AND account_id IS NOT NULL)) AS trial
      FROM entitlements WHERE revoked_at IS NULL AND starts_at <= ${now} AND ends_at > ${now} AND account_id IS NOT NULL`.execute(db),
    sql<{ status: string; n: string }>`SELECT status, count(*) AS n FROM code_batches GROUP BY status`.execute(db),
    sql<{ state: string; n: string }>`SELECT state, count(*) AS n FROM redeem_codes GROUP BY state`.execute(db),
    sql<{ n: string }>`SELECT count(*) AS n FROM redemptions`.execute(db),
    sql<{ status: string; n: string }>`SELECT status, count(*) AS n FROM shared_codes GROUP BY status`.execute(db),
    sql<{ n: string }>`SELECT count(*) AS n FROM shared_redemptions`.execute(db),
    isRedeemHalted(db),
  ]);
  const by = (rows: object[], key: string, value: string) => n((rows as Record<string, unknown>[]).find((r) => r[key] === value)?.n);
  return {
    halted,
    accounts: n(accounts.rows[0]?.n),
    inTrial: n(access.rows[0]?.trial),
    subscribed: n(access.rows[0]?.paid),
    batches: { pending: by(batches.rows, "status", "PENDING_PRINT"), confirmed: by(batches.rows, "status", "PRINT_CONFIRMED"), voided: by(batches.rows, "status", "VOIDED") },
    codes: { generated: by(codes.rows, "state", "generated"), issued: by(codes.rows, "state", "issued"), revoked: by(codes.rows, "state", "revoked"), redeemed: n(redeemed.rows[0]?.n) },
    shared: { active: by(shared.rows, "status", "active"), paused: by(shared.rows, "status", "paused"), revoked: by(shared.rows, "status", "revoked"), redemptions: n(sharedUse.rows[0]?.n) },
  };
}

export type BatchRow = {
  id: string;
  batchNumber: string;
  months: number;
  quantity: number;
  status: "PENDING_PRINT" | "PRINT_CONFIRMED" | "VOIDED";
  orderRef: string | null;
  note: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  voidReason: string | null;
  generated: number;
  issued: number;
  revoked: number;
  redeemed: number;
};

export async function listBatches(db: Db): Promise<BatchRow[]> {
  const rows = await sql<Record<string, unknown>>`
    SELECT b.id, b.batch_number, b.months, b.quantity, b.status, b.order_ref, b.note, b.created_at, b.confirmed_at, b.void_reason,
           count(c.id) FILTER (WHERE c.state = 'generated') AS generated,
           count(c.id) FILTER (WHERE c.state = 'issued') AS issued,
           count(c.id) FILTER (WHERE c.state = 'revoked') AS revoked,
           count(r.id) AS redeemed
    FROM code_batches b
    LEFT JOIN redeem_codes c ON c.batch_id = b.id
    LEFT JOIN redemptions r ON r.code_id = c.id
    GROUP BY b.id ORDER BY b.created_at DESC LIMIT 200`.execute(db);
  return rows.rows.map((r) => ({
    id: String(r.id), batchNumber: String(r.batch_number), months: n(r.months), quantity: n(r.quantity), status: r.status as BatchRow["status"],
    orderRef: (r.order_ref as string | null) ?? null, note: (r.note as string | null) ?? null, createdAt: r.created_at as Date, confirmedAt: (r.confirmed_at as Date | null) ?? null,
    voidReason: (r.void_reason as string | null) ?? null, generated: n(r.generated), issued: n(r.issued), revoked: n(r.revoked), redeemed: n(r.redeemed),
  }));
}

/** A suggestion for the next batch number: the year and month, then the next free number that month (B2610-001). */
export async function suggestBatchNumber(db: Db, now: Date = new Date()): Promise<string> {
  const prefix = `B${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}-`;
  const rows = await db.selectFrom("code_batches").select("batch_number").where("batch_number", "like", `${prefix}%`).execute();
  const used = rows.map((r) => parseInt(r.batch_number.slice(prefix.length), 10)).filter((x) => Number.isFinite(x));
  return `${prefix}${String((used.length ? Math.max(...used) : 0) + 1).padStart(3, "0")}`;
}

export type CodeInfo = {
  serial: string;
  batchNumber: string;
  months: number;
  state: "generated" | "issued" | "revoked";
  batchStatus: string;
  revokeReason: string | null;
  redeemedAt: Date | null;
  redeemedBy: string | null;
};

/** One card, found by its serial number (printed outside the scratch area, so a card can be found without scratching it). */
export async function findCodeBySerial(db: Db, serial: string): Promise<CodeInfo | null> {
  const row = await db
    .selectFrom("redeem_codes as c")
    .innerJoin("code_batches as b", "b.id", "c.batch_id")
    .leftJoin("redemptions as r", "r.code_id", "c.id")
    .leftJoin("reader_accounts as a", "a.id", "r.account_id")
    .select(["c.serial", "b.batch_number", "b.months", "c.state", "b.status as batch_status", "c.revoke_reason", "r.redeemed_at", "a.email"])
    .where("c.serial", "=", serial.trim().toUpperCase())
    .executeTakeFirst();
  if (!row) return null;
  return { serial: row.serial, batchNumber: row.batch_number, months: row.months, state: row.state, batchStatus: row.batch_status, revokeReason: row.revoke_reason, redeemedAt: row.redeemed_at, redeemedBy: row.email };
}

export type SharedRow = {
  id: string;
  code: string;
  grantText: string;
  maxRedemptions: number;
  redeemedCount: number;
  expiresAt: Date | null;
  status: "active" | "paused" | "revoked";
  channel: string | null;
  note: string | null;
  createdAt: Date;
};

export async function listSharedCodes(db: Db): Promise<SharedRow[]> {
  const rows = await db.selectFrom("shared_codes").selectAll().orderBy("created_at", "desc").limit(200).execute();
  return rows.map((r) => ({
    id: r.id, code: r.code, grantText: r.grant_unit === "days" ? `${r.grant_amount} hari` : `${r.grant_amount} bulan`, maxRedemptions: r.max_redemptions,
    redeemedCount: r.redeemed_count, expiresAt: r.expires_at, status: r.status, channel: r.channel, note: r.note, createdAt: r.created_at,
  }));
}

export type ReaderHit = { id: string; email: string; displayName: string | null; createdAt: Date; status: string };

export async function findReaders(db: Db, query: string): Promise<ReaderHit[]> {
  const q = query.trim().toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`);
  if (q.length < 3) return [];
  const rows = await db.selectFrom("reader_accounts").select(["id", "email", "display_name", "created_at", "status"]).where("email_normalized", "like", `%${q}%`).where("status", "<>", "deleted").orderBy("created_at", "desc").limit(20).execute();
  return rows.map((r) => ({ id: r.id, email: r.email, displayName: r.display_name, createdAt: r.created_at, status: r.status }));
}

export type ReaderDetail = { id: string; email: string; displayName: string | null; createdAt: Date; lastLoginAt: Date | null; devices: number; access: AccessSummary; ledger: LedgerRow[] };

export async function readerDetail(db: Db, id: string, now: Date = new Date()): Promise<ReaderDetail | null> {
  const account = await db.selectFrom("reader_accounts").selectAll().where("id", "=", id).where("status", "<>", "deleted").executeTakeFirst();
  if (!account) return null;
  const devices = await db.selectFrom("reader_devices").select(sql<string>`count(*)`.as("n")).where("account_id", "=", id).where("revoked_at", "is", null).executeTakeFirstOrThrow();
  return { id: account.id, email: account.email, displayName: account.display_name, createdAt: account.created_at, lastLoginAt: account.last_login_at, devices: n(devices.n), access: await getAccess(db, id, now), ledger: await listLedger(db, id) };
}
