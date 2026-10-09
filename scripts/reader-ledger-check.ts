/**
 * Checks the access ledger (migration 029, src/lib/reader-auth/entitlements.ts) against a real database. Most of it runs inside one
 * transaction that is rolled back. The last part commits real rows from several connections at once (a transaction cannot test
 * that) and cleans up with TRUNCATE, which is allowed on the development branch only: src/lib/db/env.ts keeps this script off production.
 * Run: npm run db:reader-ledger-check
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { addGrant, addTrial, getAccess, listLedger, rawLedgerSummary, revokeGrant } from "../src/lib/reader-auth/entitlements";
import { addMonthsMYT } from "../src/lib/subscription/periods";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
class Rollback extends Error {}
const T0 = new Date("2026-11-01T02:00:00Z");
const day = (n: number) => new Date(T0.getTime() + n * 86400000);
const same = (a: Date, b: Date) => a.getTime() === b.getTime();

async function refuses(trx: any, label: string, run: () => Promise<unknown>) {
  await sql`SAVEPOINT s`.execute(trx);
  try { await run(); await sql`RELEASE SAVEPOINT s`.execute(trx); assert(false, `${label} (was accepted)`); }
  catch (error) { await sql`ROLLBACK TO SAVEPOINT s`.execute(trx); assert((error as { code?: string }).code === "23000" || (error as { code?: string }).code === "23514" || (error as { code?: string }).code === "23505", label, (error as { code?: string }).code); }
}

async function newAccount(trx: any, email: string): Promise<string> {
  const row = await sql<{ id: string }>`INSERT INTO reader_accounts (email, email_normalized) VALUES (${email}, ${email}) RETURNING id`.execute(trx);
  return row.rows[0].id;
}

async function main() {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      const a = await newAccount(trx, "ledger-a@e2e.invalid");
      await addTrial(trx, a, T0, day(14));
      await addTrial(trx, a, T0, day(14));
      let ledger = await listLedger(trx, a);
      assert(ledger.length === 1 && ledger[0].kind === "TRIAL", "the trial is added once, however many times it is asked for");
      assert((await getAccess(trx, a, day(1))).state === "trial" && (await getAccess(trx, a, day(20))).state === "expired", "trial, then expired");

      // Stacking.
      const g1 = await addGrant(trx, { accountId: a, kind: "CARD", grant: { unit: "months", amount: 1 }, sourceRef: "redemption-1", reason: "Kad 1 bulan", now: day(3) });
      assert(g1.added && same(g1.startsAt, day(14)) && same(g1.endsAt, addMonthsMYT(day(14), 1)), "a card redeemed during the trial starts when the trial ends", g1);
      const g2 = await addGrant(trx, { accountId: a, kind: "SHARED", grant: { unit: "days", amount: 7 }, sourceRef: "shared-1:" + a, now: day(4) });
      assert(g2.added && g1.added && same(g2.startsAt, g1.endsAt) && same(g2.endsAt, new Date(g1.endsAt.getTime() + 7 * 86400000)), "the next grant starts when the previous one ends");
      const g3 = await addGrant(trx, { accountId: a, kind: "ADMIN", grant: { unit: "months", amount: 6 }, reason: "Hadiah", createdBy: "izzat", now: day(5) });
      assert(g3.added && g2.added && same(g3.startsAt, g2.endsAt), "a grant by Izzat stacks the same way");
      const access = await getAccess(trx, a, day(20));
      assert(access.state === "subscribed" && g3.added && same(access.endsAt!, g3.endsAt) && g1.added && same(access.currentPeriodEndsAt!, g1.endsAt), "the reader is subscribed; the run of access reaches the end of the last grant", access);
      assert(JSON.stringify(access) === JSON.stringify(await rawLedgerSummary(trx, a, day(20))), "the helper and a rebuild from the raw rows agree");

      // Safe to repeat.
      const again = await addGrant(trx, { accountId: a, kind: "CARD", grant: { unit: "months", amount: 1 }, sourceRef: "redemption-1", now: day(6) });
      assert(!again.added && again.reason === "duplicate" && g1.added && again.id === g1.id && (await listLedger(trx, a)).length === 4, "the same redemption cannot add a second period");
      const noOne = await addGrant(trx, { accountId: "00000000-0000-0000-0000-000000000000", kind: "ADMIN", grant: { unit: "months", amount: 1 }, now: day(6) });
      assert(!noOne.added && noOne.reason === "no_account", "a grant to an account that does not exist is refused");

      // The ledger cannot be edited.
      const idOf = (await listLedger(trx, a))[1].id;
      await refuses(trx, "a period cannot be shortened", () => sql`UPDATE entitlements SET ends_at = ends_at - interval '1 day' WHERE id = ${idOf}`.execute(trx));
      await refuses(trx, "the kind cannot be changed", () => sql`UPDATE entitlements SET kind = 'ADMIN' WHERE id = ${idOf}`.execute(trx));
      await refuses(trx, "the reason cannot be rewritten", () => sql`UPDATE entitlements SET reason = 'lain' WHERE id = ${idOf}`.execute(trx));
      await refuses(trx, "a period cannot be deleted", () => sql`DELETE FROM entitlements WHERE id = ${idOf}`.execute(trx));
      const b = await newAccount(trx, "ledger-b@e2e.invalid");
      await refuses(trx, "a period cannot be moved to another account", () => sql`UPDATE entitlements SET account_id = ${b} WHERE id = ${idOf}`.execute(trx));
      await refuses(trx, "a period must end after it starts", () => sql`INSERT INTO entitlements (account_id, kind, starts_at, ends_at) VALUES (${a}, 'ADMIN', now(), now())`.execute(trx));
      await refuses(trx, "an unknown kind is refused", () => sql`INSERT INTO entitlements (account_id, kind, starts_at, ends_at) VALUES (${a}, 'GRATIS', now(), now() + interval '1 day')`.execute(trx));
      await refuses(trx, "cancelling needs a reason", () => sql`UPDATE entitlements SET revoked_at = now() WHERE id = ${idOf}`.execute(trx));

      // Cancelling.
      let noReason = false;
      try { await revokeGrant(trx, idOf, "izzat", "  "); } catch { noReason = true; }
      assert(noReason, "the code also refuses to cancel without a reason");
      assert(await revokeGrant(trx, idOf, "izzat", "Tersalah beri", day(7)), "a period is cancelled once, with a reason");
      assert(!(await revokeGrant(trx, idOf, "izzat", "lagi", day(8))), "cancelling again does nothing");
      await refuses(trx, "a cancellation cannot be taken back", () => sql`UPDATE entitlements SET revoked_at = NULL, revoked_by = NULL, revoke_reason = NULL WHERE id = ${idOf}`.execute(trx));
      await refuses(trx, "a cancellation cannot be rewritten", () => sql`UPDATE entitlements SET revoke_reason = 'lain' WHERE id = ${idOf}`.execute(trx));
      const afterRevoke = await getAccess(trx, a, day(20));
      assert(afterRevoke.state === "expired" && JSON.stringify(afterRevoke) === JSON.stringify(await rawLedgerSummary(trx, a, day(20))), "cancelling the card leaves a gap: the periods after it stay where they were and are not moved earlier");
      assert(g2.added && g3.added && (await getAccess(trx, a, new Date(g2.startsAt.getTime() + 86400000))).state === "subscribed", "and when the next period begins the reader is subscribed again");

      // Deleting the account keeps the periods, anonymously.
      await sql`DELETE FROM reader_accounts WHERE id = ${a}`.execute(trx);
      const kept = await sql<{ n: string; linked: string }>`SELECT count(*) AS n, count(account_id) AS linked FROM entitlements WHERE source_ref IN ('redemption-1', ${a}) OR reason IN ('Hadiah')`.execute(trx);
      assert(Number(kept.rows[0].n) >= 3 && Number(kept.rows[0].linked) === 0, "deleting the account cuts the link but keeps the periods as an anonymous record", kept.rows[0]);

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) { failed++; console.error("  ✗ unexpected error:", error); }
  }

  // Several connections at once (committed for real, then truncated: development branch only).
  try {
    const acc = await sql<{ id: string }>`INSERT INTO reader_accounts (email, email_normalized) VALUES ('ledger-c@e2e.invalid', 'ledger-c@e2e.invalid') RETURNING id`.execute(db);
    const id = acc.rows[0].id;
    const now = new Date();
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => addGrant(db, { accountId: id, kind: "ADMIN", grant: { unit: "days", amount: 7 }, sourceRef: `par-${i}`, now })));
    const ledger = (await listLedger(db, id)).sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime());
    let chained = ledger.length === 8;
    for (let i = 1; i < ledger.length; i++) if (!same(ledger[i].startsAt, ledger[i - 1].endsAt)) chained = false;
    assert(results.every((r) => r.added) && chained, "eight grants at once are placed one after the other: no overlaps, no gaps, none lost", ledger.map((l) => [l.startsAt.toISOString(), l.endsAt.toISOString()]));
    const twice = await Promise.all(Array.from({ length: 6 }, () => addGrant(db, { accountId: id, kind: "CARD", grant: { unit: "months", amount: 1 }, sourceRef: "same-redemption", now })));
    assert(twice.filter((r) => r.added).length === 1 && (await listLedger(db, id)).filter((l) => l.kind === "CARD").length === 1, "six requests with the same source at once add exactly one period");
  } catch (error) {
    failed++; console.error("  ✗ unexpected error in the concurrent part:", error);
  } finally {
    await sql`TRUNCATE entitlements`.execute(db);
    await sql`DELETE FROM reader_accounts WHERE email_normalized LIKE '%@e2e.invalid'`.execute(db);
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

void main();
