/** In-memory PostgreSQL only. Set PGLITE_MODULE to the external test installation. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { Kysely, PostgresDialect, sql } from "kysely";
import type { Database } from "../src/lib/db/types";
import { up as activity } from "../src/lib/db/migrations/026_admin_activity";
import { up as accounts } from "../src/lib/db/migrations/027_reader_accounts";
import { up as events } from "../src/lib/db/migrations/028_reader_auth_events";
import { up as entitlements } from "../src/lib/db/migrations/029_entitlements";
import { up as codes } from "../src/lib/db/migrations/030_redeem_codes";
import { up as channels } from "../src/lib/db/migrations/036_card_channel_and_redeem_by";
import { up as labels } from "../src/lib/db/migrations/038_physical_label_storage";
import { encryptBackup } from "../src/lib/reader-auth/backup-crypto";
import { buildCodesExport, reconcileWithExport } from "../src/lib/reader-auth/codes-export";
import { generatePhysicalLabels, printPhysicalLabels, LabelPrintError } from "../src/lib/reader-auth/physical-labels";
import { confirmBatchPrinted, issueCodes, redeemCode } from "../src/lib/reader-auth/redeem";
import { decryptLabelCode } from "../src/lib/subscription/label-crypto";

async function fixture() {
  const modulePath = process.env.PGLITE_MODULE;
  if (!modulePath) throw new Error("Set PGLITE_MODULE to an external PGlite install.");
  const { PGlite } = createRequire(import.meta.url)(modulePath);
  const pg = new PGlite();
  const client = {
    async query(text: string, values: unknown[]) {
      const result = await pg.query(text, values);
      return { rows: result.rows, rowCount: result.affectedRows ?? 0, command: text.trim().split(/\s+/, 1)[0]?.toUpperCase() };
    },
    release() {},
  };
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: { connect: async () => client, end: async () => pg.close() } as never }) });
  try {
    await sql`CREATE TABLE works (id text PRIMARY KEY)`.execute(db);
    const migrationDb = db as unknown as Kysely<unknown>;
    for (const migrate of [activity, accounts, events, entitlements, codes, channels, labels, labels]) await migrate(migrationDb);
    return db;
  } catch (error) {
    await db.destroy();
    throw error;
  }
}

async function main() {
  const db = await fixture();
  const now = new Date("2026-11-07T08:00:00Z");
  const codeKey = { keyId: "test-code", key: randomBytes(32) };
  const readerKey = { keyId: "test-reader", key: randomBytes(32) };
  const backupKey = randomBytes(32);
  const actor = { id: "fixture", name: "Ujian setempat" };
  const input = { months: 6 as const, quantity: 2, redeemBy: new Date("2027-11-07T08:00:00Z") };
  const print = { keys: [codeKey], actor, now };
  try {
    const made = await generatePhysicalLabels(db, { codeKey, actor, now }, input);
    assert.equal(made.count, 2);
    const rows = await db.selectFrom("redeem_codes").selectAll().orderBy("serial").execute();
    assert.equal(rows.length, 2);
    const first = rows[0]!;
    assert.equal(first.state, "generated");
    assert.ok(first.label_cipher && first.label_key_id === codeKey.keyId);
    const plain = decryptLabelCode(codeKey.key, first.serial, first.label_cipher);
    assert.ok(!JSON.stringify(rows).includes(plain), "Code must not appear in stored rows as plaintext");
    assert.ok((await printPhysicalLabels(db, print, { batchId: made.batchId })).pdf === made.pdf, "Reprint must reproduce the original PDF");
    const subset = await printPhysicalLabels(db, print, { batchId: made.batchId, serials: [first.serial] });
    assert.equal(subset.count, 1);
    await assert.rejects(() => printPhysicalLabels(db, { ...print, keys: [] }, { batchId: made.batchId }), (error: unknown) => error instanceof LabelPrintError && error.reason === "recovery");
    assert.equal((await db.selectFrom("redeem_codes").select("id").execute()).length, 2);

    await confirmBatchPrinted(db, made.batchId, now);
    assert.equal(await issueCodes(db, { batchId: made.batchId }, now), 2);
    const account = await db.insertInto("reader_accounts").values({ email: "fixture@example.invalid", email_normalized: "fixture@example.invalid" }).returning("id").executeTakeFirstOrThrow();
    const redeemed = await redeemCode(db, { codeKey, now }, { accountId: account.id, ipMac: "fixture", code: plain, serial: first.serial });
    assert.equal(redeemed.status, "ok");
    await assert.rejects(() => printPhysicalLabels(db, print, { batchId: made.batchId, serials: [first.serial] }), (error: unknown) => error instanceof LabelPrintError && error.reason === "selection");
    const remaining = await printPhysicalLabels(db, print, { batchId: made.batchId });
    assert.equal(remaining.count, 1);

    const backup = encryptBackup(await buildCodesExport(db, { codeKey, readerKey, now }), backupKey);
    const restored = await fixture();
    try {
      await reconcileWithExport(restored, backup, { apply: true, codeKey, backupKey, now });
      const batch = await restored.selectFrom("code_batches").select("id").executeTakeFirstOrThrow();
      const reprint = await printPhysicalLabels(restored, print, { batchId: batch.id });
      assert.ok(reprint.pdf === remaining.pdf, "Restored label must match and redeemed code must stay excluded");
    } finally { await restored.destroy(); }

    await sql`ALTER TABLE admin_activity ADD CHECK (action <> 'subscription.batch.create') NOT VALID`.execute(db);
    await assert.rejects(() => generatePhysicalLabels(db, { codeKey, actor, now }, input), /check constraint/i);
    assert.equal((await db.selectFrom("code_batches").select("id").execute()).length, 1);
    assert.equal((await db.selectFrom("redeem_codes").select("id").execute()).length, 2);
    console.log("PASS: stored codes, identical reprint, selected PDF, missing key, redemption, encrypted restore and audit rollback.");
  } finally { await db.destroy(); }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Label integration failed"); process.exitCode = 1; });
