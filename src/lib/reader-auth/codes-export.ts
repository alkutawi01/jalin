/**
 * The copy of the code tables kept OUTSIDE the database (study gate G4: "no double redemption, even after a restore").
 *
 * The danger: the database is restored to an earlier moment. Cards redeemed after that moment look unredeemed again, and a card could be
 * used twice. So a signed file is made every day and kept somewhere else (Vercel Blob, and downloadable from the admin). After any restore
 * the file is applied (reconcile), always in the SAFE direction: a code the file says was used, cancelled or voided can never become
 * valid again; codes and batches that were printed after the restore point are put back; counters of shared codes never go down.
 *
 * The signed NDJSON contains shared codes in plaintext and therefore MUST be encrypted before storage or download.
 * Card codes and reader e-mail addresses are represented by keyed hashes; the encrypted backup still needs restricted handling.
 *
 * Pure parsing and signing live here with the database steps, so both can be tested.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { Database } from "../db/types";
import { decryptBackup, isEncryptedBackup, loadBackupEncKey } from "./backup-crypto";
import { emailLookupMac, type MacKey } from "./primitives";
import { isRedeemHalted, setRedeemHalted } from "./redeem";
import type { Db } from "./service";

export const EXPORT_VERSION = 1;

type Line = Record<string, unknown> & { t: string };

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

function sign(codeKey: MacKey, digest: string): string {
  return createHmac("sha256", codeKey.key).update(`jalin-export-v${EXPORT_VERSION}:${digest}`).digest("hex");
}

/** The file as text: one JSON object per line, ending with a line that counts them and signs them. */
export async function buildCodesExport(db: Db, deps: { codeKey: MacKey; readerKey: MacKey; now?: Date }): Promise<string> {
  const now = deps.now ?? new Date();
  const lines: Line[] = [];
  const halted = await isRedeemHalted(db);

  const batches = await db.selectFrom("code_batches").selectAll().orderBy("created_at", "asc").execute();
  const codes = await db
    .selectFrom("redeem_codes as c")
    .innerJoin("code_batches as b", "b.id", "c.batch_id")
    .select(["c.serial", "c.code_mac", "c.key_id", "c.state", "c.issued_at", "c.revoked_at", "c.revoke_reason", "b.batch_number"])
    .orderBy("c.serial", "asc")
    .execute();
  const redemptions = await db
    .selectFrom("redemptions as r")
    .innerJoin("redeem_codes as c", "c.id", "r.code_id")
    .innerJoin("code_batches as b", "b.id", "c.batch_id")
    .innerJoin("entitlements as e", "e.id", "r.entitlement_id")
    .leftJoin("reader_accounts as a", "a.id", "r.account_id")
    .select(["c.serial", "r.redeemed_at", "b.months", "e.starts_at", "e.ends_at", "a.email_normalized"])
    .orderBy("r.redeemed_at", "asc")
    .execute();
  const shared = await db.selectFrom("shared_codes").selectAll().orderBy("created_at", "asc").execute();
  const sharedUse = await db
    .selectFrom("shared_redemptions as r")
    .innerJoin("shared_codes as s", "s.id", "r.shared_code_id")
    .leftJoin("reader_accounts as a", "a.id", "r.account_id")
    .select(["s.code", "r.redeemed_at", "a.email_normalized"])
    .orderBy("r.redeemed_at", "asc")
    .execute();

  lines.push({ t: "meta", v: EXPORT_VERSION, at: now.toISOString(), halted, keyIds: [...new Set(codes.map((c) => c.key_id))].sort(), counts: { batches: batches.length, codes: codes.length, redemptions: redemptions.length, shared: shared.length, sharedRedemptions: sharedUse.length } });
  for (const b of batches) {
    lines.push({ t: "batch", number: b.batch_number, months: b.months, quantity: b.quantity, status: b.status, orderRef: b.order_ref, note: b.note, keyId: b.key_id, createdBy: b.created_by, createdAt: iso(b.created_at), confirmedAt: iso(b.confirmed_at), voidedAt: iso(b.voided_at), voidReason: b.void_reason });
  }
  for (const c of codes) {
    lines.push({ t: "code", batch: c.batch_number, serial: c.serial, mac: c.code_mac, keyId: c.key_id, state: c.state, issuedAt: iso(c.issued_at), revokedAt: iso(c.revoked_at), revokeReason: c.revoke_reason });
  }
  for (const r of redemptions) {
    lines.push({ t: "redemption", serial: r.serial, at: iso(r.redeemed_at), months: r.months, from: iso(r.starts_at), to: iso(r.ends_at), emailMac: r.email_normalized ? emailLookupMac(deps.readerKey, r.email_normalized) : null });
  }
  for (const s of shared) {
    lines.push({ t: "shared", code: s.code, unit: s.grant_unit, amount: s.grant_amount, max: s.max_redemptions, count: s.redeemed_count, expiresAt: iso(s.expires_at), status: s.status, channel: s.channel, note: s.note, createdBy: s.created_by, createdAt: iso(s.created_at) });
  }
  for (const r of sharedUse) {
    lines.push({ t: "shared_redemption", code: r.code, at: iso(r.redeemed_at), emailMac: r.email_normalized ? emailLookupMac(deps.readerKey, r.email_normalized) : null });
  }

  const body = lines.map((l) => JSON.stringify(l)).join("\n");
  const digest = createHash("sha256").update(body).digest("hex");
  const end: Line = { t: "end", lines: lines.length, digest, sig: sign(deps.codeKey, digest) };
  return `${body}\n${JSON.stringify(end)}\n`;
}

export type ParsedExport = {
  at: Date;
  halted: boolean;
  batches: Line[];
  codes: Line[];
  redemptions: Line[];
  shared: Line[];
  sharedRedemptions: Line[];
};

export type ParseExportOptions = { backupKey?: Buffer; allowLegacyPlaintext?: boolean };

/** Decrypt current backups. Plain NDJSON requires an explicit manual-recovery opt-in. */
export function parseCodesExport(file: string, codeKey: MacKey, options: ParseExportOptions = {}): ParsedExport {
  const text = isEncryptedBackup(file) ? decryptBackup(file, options.backupKey ?? loadBackupEncKey()) : file;
  if (!isEncryptedBackup(file) && !options.allowLegacyPlaintext) throw new Error("Eksport teks biasa lama hanya dibenarkan untuk pemulihan manual.");
  const rows = text.split("\n").filter((l) => l.length > 0);
  if (rows.length < 2) throw new Error("Fail eksport kosong atau terlalu pendek.");
  let parsed: Line[];
  try { parsed = rows.map((r) => JSON.parse(r) as Line); } catch { throw new Error("Fail eksport rosak: baris bukan JSON."); }
  const end = parsed[parsed.length - 1];
  if (end.t !== "end") throw new Error("Fail eksport tidak lengkap: tiada baris penutup.");
  const body = rows.slice(0, -1).join("\n");
  if (end.lines !== rows.length - 1) throw new Error("Fail eksport tidak lengkap: bilangan baris tidak sepadan.");
  const digest = createHash("sha256").update(body).digest("hex");
  if (end.digest !== digest) throw new Error("Fail eksport telah diubah: ringkasan tidak sepadan.");
  const expected = Buffer.from(sign(codeKey, digest), "hex");
  const given = Buffer.from(String(end.sig ?? ""), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new Error("Tandatangan fail eksport tidak sah (kunci lain, atau fail dipalsukan).");
  const meta = parsed[0];
  if (meta.t !== "meta" || meta.v !== EXPORT_VERSION) throw new Error("Versi fail eksport tidak dikenali.");
  const of = (t: string) => parsed.filter((l) => l.t === t);
  return { at: new Date(String(meta.at)), halted: meta.halted === true, batches: of("batch"), codes: of("code"), redemptions: of("redemption"), shared: of("shared"), sharedRedemptions: of("shared_redemption") };
}

export type ReconcileReport = {
  exportAt: string;
  applied: boolean;
  batchesAdded: number;
  batchesVoided: number;
  codesAdded: number;
  codesCancelledForLostRedemption: number;
  codesCancelledAsInExport: number;
  sharedAdded: number;
  sharedCountsRaised: number;
  sharedStatusTightened: number;
  serialSequenceSetTo: number | null;
  /** Redemptions the file knows and the database does not: the reader needs access given back by hand (find them by e-mail). */
  lostRedemptions: { serial: string; at: string; months: number; emailMac: string | null }[];
  lostSharedRedemptions: { code: string; at: string; emailMac: string | null }[];
};

const serialNumber = (serial: string) => parseInt(serial.slice(-6), 10);

/**
 * Bring the database in line with a file, in the safe direction only. With apply=false nothing is written and the report says what would
 * be done. With apply=true the stop switch is switched ON first and is NOT switched off here: that is a person's decision after reading the report.
 */
export async function reconcileWithExport(db: Db, input: ParsedExport | string, options: { apply: boolean; now?: Date; by?: string; codeKey?: MacKey; backupKey?: Buffer; allowLegacyPlaintext?: boolean }): Promise<ReconcileReport> {
  const exported = typeof input === "string"
    ? parseCodesExport(input, options.codeKey ?? (() => { throw new Error("Kunci tandatangan diperlukan untuk membaca eksport."); })(), { backupKey: options.backupKey, allowLegacyPlaintext: options.allowLegacyPlaintext })
    : input;
  const now = options.now ?? new Date();
  const report: ReconcileReport = {
    exportAt: exported.at.toISOString(), applied: options.apply, batchesAdded: 0, batchesVoided: 0, codesAdded: 0, codesCancelledForLostRedemption: 0, codesCancelledAsInExport: 0,
    sharedAdded: 0, sharedCountsRaised: 0, sharedStatusTightened: 0, serialSequenceSetTo: null, lostRedemptions: [], lostSharedRedemptions: [],
  };
  if (options.apply) await setRedeemHalted(db, true, options.by ?? "pemulihan", now);

  const run = async (trx: Db) => {
    const date = (v: unknown) => (v ? new Date(String(v)) : null);

    // Batches: put back the ones printed after the restore point; a batch the file says was voided is voided here too.
    const batchIds = new Map<string, string>();
    for (const b of exported.batches) {
      const number = String(b.number);
      const existing = await trx.selectFrom("code_batches").select(["id", "status"]).where("batch_number", "=", number).executeTakeFirst();
      if (existing) {
        batchIds.set(number, existing.id);
        if (b.status === "VOIDED" && existing.status !== "VOIDED") {
          if (options.apply) await trx.updateTable("code_batches").set({ status: "VOIDED", voided_at: date(b.voidedAt) ?? now, void_reason: String(b.voidReason ?? "Dibatalkan (pulihan)") }).where("id", "=", existing.id).execute();
          report.batchesVoided++;
        }
        continue;
      }
      report.batchesAdded++;
      if (options.apply) {
        const row = await trx
          .insertInto("code_batches")
          .values({ batch_number: number, months: Number(b.months), quantity: Number(b.quantity), status: b.status as "PENDING_PRINT" | "PRINT_CONFIRMED" | "VOIDED", order_ref: (b.orderRef as string) ?? null, note: (b.note as string) ?? null, key_id: String(b.keyId), created_by: (b.createdBy as string) ?? null, created_at: date(b.createdAt) ?? now, confirmed_at: date(b.confirmedAt), voided_at: date(b.voidedAt), void_reason: (b.voidReason as string) ?? null })
          .returning("id")
          .executeTakeFirstOrThrow();
        batchIds.set(number, row.id);
      }
    }

    // Codes.
    let maxSerial = 0;
    for (const c of exported.codes) {
      const serial = String(c.serial);
      maxSerial = Math.max(maxSerial, serialNumber(serial));
      const existing = await trx.selectFrom("redeem_codes").select(["id", "state"]).where("serial", "=", serial).executeTakeFirst();
      if (!existing) {
        report.codesAdded++;
        if (options.apply) {
          const batchId = batchIds.get(String(c.batch)) ?? (await trx.selectFrom("code_batches").select("id").where("batch_number", "=", String(c.batch)).executeTakeFirstOrThrow()).id;
          await trx.insertInto("redeem_codes").values({ batch_id: batchId, serial, code_mac: String(c.mac), key_id: String(c.keyId), state: c.state as "generated" | "issued" | "revoked", issued_at: date(c.issuedAt), revoked_at: date(c.revokedAt), revoke_reason: (c.revokeReason as string) ?? null }).execute();
        }
        continue;
      }
      if (c.state === "revoked" && existing.state !== "revoked") {
        report.codesCancelledAsInExport++;
        if (options.apply) await trx.updateTable("redeem_codes").set({ state: "revoked", revoked_at: date(c.revokedAt) ?? now, revoke_reason: String(c.revokeReason ?? "Dibatalkan (pulihan)") }).where("id", "=", existing.id).execute();
      }
    }

    // Redemptions the file knows: if the database has none for that code, the code is cancelled so it can never be used a second time.
    for (const r of exported.redemptions) {
      const serial = String(r.serial);
      const code = await trx.selectFrom("redeem_codes").select(["id", "state"]).where("serial", "=", serial).executeTakeFirst();
      const hasRedemption = code ? !!(await trx.selectFrom("redemptions").select("id").where("code_id", "=", code.id).executeTakeFirst()) : false;
      if (hasRedemption) continue;
      report.lostRedemptions.push({ serial, at: String(r.at), months: Number(r.months), emailMac: (r.emailMac as string | null) ?? null });
      if (!code && !options.apply) { report.codesCancelledForLostRedemption++; continue; }
      if (options.apply && code && code.state !== "revoked") {
        await trx.updateTable("redeem_codes").set({ state: "revoked", revoked_at: now, revoke_reason: `Ditebus ${String(r.at).slice(0, 10)} sebelum pemulihan pangkalan data` }).where("id", "=", code.id).execute();
      }
      if (code && code.state !== "revoked") report.codesCancelledForLostRedemption++;
    }

    // The serial counter must not hand out a number the file already knows.
    const seq = await sql<{ last_value: string; is_called: boolean }>`SELECT last_value, is_called FROM redeem_serial_seq`.execute(trx);
    const current = Number(seq.rows[0].last_value) - (seq.rows[0].is_called ? 0 : 1);
    if (maxSerial > current) {
      report.serialSequenceSetTo = maxSerial;
      if (options.apply) await sql`SELECT setval('redeem_serial_seq', ${maxSerial}, true)`.execute(trx);
    }

    // Shared codes: put back the missing; a count never goes down; a status can only get stricter.
    const rank = { active: 0, paused: 1, revoked: 2 } as const;
    for (const s of exported.shared) {
      const code = String(s.code);
      const existing = await trx.selectFrom("shared_codes").select(["id", "redeemed_count", "status"]).where("code", "=", code).executeTakeFirst();
      if (!existing) {
        report.sharedAdded++;
        if (options.apply) await trx.insertInto("shared_codes").values({ code, grant_unit: s.unit as "days" | "months", grant_amount: Number(s.amount), max_redemptions: Number(s.max), redeemed_count: Math.min(Number(s.count), Number(s.max)), expires_at: date(s.expiresAt), status: s.status as "active" | "paused" | "revoked", channel: (s.channel as string) ?? null, note: (s.note as string) ?? null, created_by: (s.createdBy as string) ?? null, created_at: date(s.createdAt) ?? now }).execute();
        continue;
      }
      const target = Math.min(Number(s.count), Number(s.max));
      if (target > existing.redeemed_count) {
        report.sharedCountsRaised++;
        if (options.apply) await trx.updateTable("shared_codes").set({ redeemed_count: target }).where("id", "=", existing.id).execute();
      }
      if (rank[s.status as keyof typeof rank] > rank[existing.status]) {
        report.sharedStatusTightened++;
        if (options.apply) await trx.updateTable("shared_codes").set({ status: s.status as "paused" | "revoked" }).where("id", "=", existing.id).execute();
      }
    }
    for (const r of exported.sharedRedemptions) {
      // The reader link cannot be rebuilt, so the count above is what protects the limit; the list is for giving access back by hand.
      const known = await trx.selectFrom("shared_codes as s").innerJoin("shared_redemptions as r", "r.shared_code_id", "s.id").select("r.id").where("s.code", "=", String(r.code)).limit(1).executeTakeFirst();
      if (!known) report.lostSharedRedemptions.push({ code: String(r.code), at: String(r.at), emailMac: (r.emailMac as string | null) ?? null });
    }
  };

  // A dry run writes nothing (every write above is behind options.apply), so it can simply read; applying runs as one transaction.
  if (!options.apply) await run(db);
  else await (db.isTransaction ? run(db) : (db as Kysely<Database>).transaction().execute((trx) => run(trx)));
  return report;
}

/** Who redeemed what, by e-mail: for a reader who says their access vanished after a restore. Works from the file, not the database. */
export function findRedemptionsByEmailMac(exported: ParsedExport, emailMac: string): { kind: "card" | "shared"; ref: string; at: string; months?: number }[] {
  const found: { kind: "card" | "shared"; ref: string; at: string; months?: number }[] = [];
  for (const r of exported.redemptions) if (r.emailMac === emailMac) found.push({ kind: "card", ref: String(r.serial), at: String(r.at), months: Number(r.months) });
  for (const r of exported.sharedRedemptions) if (r.emailMac === emailMac) found.push({ kind: "shared", ref: String(r.code), at: String(r.at) });
  return found;
}
