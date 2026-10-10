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
  const q = query.replace(/[\u0000-\u001f]/g, "").trim().toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`);
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

// ------------------------------------------------------------------ the cards of one batch

export type CodeRow = {
  serial: string;
  state: "generated" | "issued" | "revoked";
  issuedAt: Date | null;
  revokedAt: Date | null;
  revokeReason: string | null;
  redeemedAt: Date | null;
  redeemedBy: string | null;
  accessEndsAt: Date | null;
};

export type CodeFilter = "all" | "unredeemed" | "redeemed" | "revoked" | "generated" | "issued";

export type BatchInfo = {
  id: string;
  batchNumber: string;
  months: number;
  quantity: number;
  status: "PENDING_PRINT" | "PRINT_CONFIRMED" | "VOIDED";
  orderRef: string | null;
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
  confirmedAt: Date | null;
  voidedAt: Date | null;
  voidReason: string | null;
  counts: { total: number; generated: number; issued: number; revoked: number; redeemed: number; unredeemedIssued: number };
};

export async function batchInfo(db: Db, id: string): Promise<BatchInfo | null> {
  const b = await db.selectFrom("code_batches").selectAll().where("id", "=", id).executeTakeFirst();
  if (!b) return null;
  const c = await sql<Record<string, unknown>>`
    SELECT count(*) AS total,
           count(*) FILTER (WHERE c.state = 'generated') AS generated,
           count(*) FILTER (WHERE c.state = 'issued') AS issued,
           count(*) FILTER (WHERE c.state = 'revoked') AS revoked,
           count(r.id) AS redeemed,
           count(*) FILTER (WHERE c.state = 'issued' AND r.id IS NULL) AS unredeemed_issued
    FROM redeem_codes c LEFT JOIN redemptions r ON r.code_id = c.id WHERE c.batch_id = ${id}`.execute(db);
  const x = c.rows[0] ?? {};
  return {
    id: b.id, batchNumber: b.batch_number, months: b.months, quantity: b.quantity, status: b.status, orderRef: b.order_ref, note: b.note,
    createdAt: b.created_at, createdBy: b.created_by, confirmedAt: b.confirmed_at, voidedAt: b.voided_at, voidReason: b.void_reason,
    counts: { total: n(x.total), generated: n(x.generated), issued: n(x.issued), revoked: n(x.revoked), redeemed: n(x.redeemed), unredeemedIssued: n(x.unredeemed_issued) },
  };
}

/** The cards of a batch with their state and dates, 100 to a page. The plain codes are not here: they are not stored. */
export async function listCodes(db: Db, batchId: string, options: { filter?: CodeFilter; q?: string; page?: number } = {}): Promise<{ rows: CodeRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = 100;
  const page = Math.max(1, Math.floor(Number.isFinite(options.page) ? (options.page as number) : 1));
  const filter = options.filter ?? "all";
  const q = (options.q ?? "").replace(/[\u0000-\u001f]/g, "").trim().toUpperCase().replace(/[%_\\]/g, (m) => `\\${m}`);
  const where =
    filter === "unredeemed" ? sql`AND r.id IS NULL AND c.state <> 'revoked'`
    : filter === "redeemed" ? sql`AND r.id IS NOT NULL`
    : filter === "revoked" ? sql`AND c.state = 'revoked'`
    : filter === "generated" ? sql`AND c.state = 'generated'`
    : filter === "issued" ? sql`AND c.state = 'issued'`
    : sql``;
  const search = q ? sql`AND c.serial LIKE ${`%${q}%`}` : sql``;
  const total = await sql<{ n: string }>`SELECT count(*) AS n FROM redeem_codes c LEFT JOIN redemptions r ON r.code_id = c.id WHERE c.batch_id = ${batchId} ${where} ${search}`.execute(db);
  const rows = await sql<Record<string, unknown>>`
    SELECT c.serial, c.state, c.issued_at, c.revoked_at, c.revoke_reason, r.redeemed_at, a.email, e.ends_at
    FROM redeem_codes c
    LEFT JOIN redemptions r ON r.code_id = c.id
    LEFT JOIN reader_accounts a ON a.id = r.account_id
    LEFT JOIN entitlements e ON e.id = r.entitlement_id
    WHERE c.batch_id = ${batchId} ${where} ${search}
    ORDER BY c.serial ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`.execute(db);
  return {
    total: n(total.rows[0]?.n),
    page,
    pageSize,
    rows: rows.rows.map((r) => ({
      serial: String(r.serial), state: r.state as CodeRow["state"], issuedAt: (r.issued_at as Date | null) ?? null, revokedAt: (r.revoked_at as Date | null) ?? null,
      revokeReason: (r.revoke_reason as string | null) ?? null, redeemedAt: (r.redeemed_at as Date | null) ?? null, redeemedBy: (r.email as string | null) ?? null,
      accessEndsAt: (r.ends_at as Date | null) ?? null,
    })),
  };
}

// ------------------------------------------------------------------ the members

export type MemberStatus = "percubaan" | "aktif" | "tamat" | "tiada";

export type MemberRow = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  status: MemberStatus;
  /** The end of the last period given and not cancelled (or null when the reader never had access). */
  endsAt: Date | null;
  /** Where the latest access came from: "Percubaan", "Kad JLN-26-000012", "Kod kongsi ...", "Diberi oleh pentadbir". */
  source: string | null;
  devices: number;
};

export type MemberFilter = { status?: MemberStatus | "semua"; q?: string; page?: number; pageSize?: number };

function sourceText(kind: string | null, reason: string | null): string | null {
  if (!kind) return null;
  if (kind === "TRIAL") return "Percubaan percuma";
  if (kind === "CARD") return reason || "Kad";
  if (kind === "SHARED") return reason || "Kod kongsi";
  return reason ? `Diberi pentadbir: ${reason}` : "Diberi pentadbir";
}

/**
 * Every reader (not deleted) with the state of their access now: trial, active, ended, or none. One row per reader, newest first.
 * Filtered by status and by part of the e-mail or name, 50 to a page unless told otherwise.
 */
export async function listMembers(db: Db, filter: MemberFilter = {}, now: Date = new Date()): Promise<{ rows: MemberRow[]; total: number; page: number; pageSize: number; counts: Record<MemberStatus | "semua", number> }> {
  const pageSize = Math.min(500, Math.max(1, filter.pageSize ?? 50));
  const page = Math.max(1, Math.floor(Number.isFinite(filter.page) ? (filter.page as number) : 1));
  const q = (filter.q ?? "").replace(/[\u0000-\u001f]/g, "").trim().toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`);
  const search = q ? sql`AND (a.email_normalized LIKE ${`%${q}%`} OR lower(coalesce(a.display_name, '')) LIKE ${`%${q}%`})` : sql``;
  const base = sql`
    WITH m AS (
      SELECT a.id, a.email, a.display_name, a.created_at, a.last_login_at,
             (SELECT count(*) FROM reader_devices d WHERE d.account_id = a.id AND d.revoked_at IS NULL) AS devices,
             max(e.ends_at) FILTER (WHERE e.revoked_at IS NULL) AS last_end,
             bool_or(e.kind <> 'TRIAL' AND e.revoked_at IS NULL AND e.ends_at > ${now}) AS paid_now,
             bool_or(e.kind = 'TRIAL' AND e.revoked_at IS NULL AND e.starts_at <= ${now} AND e.ends_at > ${now}) AS trial_now
      FROM reader_accounts a LEFT JOIN entitlements e ON e.account_id = a.id
      WHERE a.status <> 'deleted' ${search}
      GROUP BY a.id
    ), s AS (
      SELECT m.*, CASE WHEN m.paid_now THEN 'aktif' WHEN m.trial_now THEN 'percubaan' WHEN m.last_end IS NOT NULL THEN 'tamat' ELSE 'tiada' END AS status FROM m
    )`;
  const counts = await sql<{ status: string; n: string }>`${base} SELECT status, count(*) AS n FROM s GROUP BY status`.execute(db);
  const byStatus = (st: string) => n(counts.rows.find((r) => r.status === st)?.n);
  const summary = { percubaan: byStatus("percubaan"), aktif: byStatus("aktif"), tamat: byStatus("tamat"), tiada: byStatus("tiada"), semua: 0 };
  summary.semua = summary.percubaan + summary.aktif + summary.tamat + summary.tiada;
  const wanted = filter.status && filter.status !== "semua" ? filter.status : null;
  const where = wanted ? sql`WHERE status = ${wanted}` : sql``;
  const total = wanted ? summary[wanted] : summary.semua;
  const rows = await sql<Record<string, unknown>>`${base} SELECT * FROM s ${where} ORDER BY created_at DESC, id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`.execute(db);
  const ids = rows.rows.map((r) => String(r.id));
  const latest = new Map<string, { kind: string; reason: string | null }>();
  if (ids.length) {
    const periods = await sql<{ account_id: string; kind: string; reason: string | null }>`
      SELECT DISTINCT ON (account_id) account_id, kind, reason FROM entitlements
      WHERE account_id IN (${sql.join(ids)}) AND revoked_at IS NULL ORDER BY account_id, ends_at DESC`.execute(db);
    for (const p of periods.rows) latest.set(p.account_id, { kind: p.kind, reason: p.reason });
  }
  return {
    total,
    page,
    pageSize,
    counts: summary,
    rows: rows.rows.map((r) => {
      const l = latest.get(String(r.id));
      return {
        id: String(r.id), email: String(r.email), displayName: (r.display_name as string | null) ?? null, createdAt: r.created_at as Date,
        lastLoginAt: (r.last_login_at as Date | null) ?? null, status: r.status as MemberStatus, endsAt: (r.last_end as Date | null) ?? null,
        source: l ? sourceText(l.kind, l.reason) : null, devices: n(r.devices),
      };
    }),
  };
}
