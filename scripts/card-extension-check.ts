/**
 * Card-extension integration checks. Default: every fixture and change rolls back on the development DB.
 * --race commits fixtures and MUST use a separate disposable branch, never the shared development branch.
 * No mailer, payment call, migration, trigger change or global cleanup is used. Secrets/codes stay in memory.
 */
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "../src/lib/db/types";
import { assertDatabaseAllowedHere } from "../src/lib/db/env";
import { migrationConnection, migrationExpectedHost, migrationFailureMessage } from "../src/lib/db/migration-connection";
import { loadMigrationEnvironment } from "./lib/migration-env";
import { addGrant, addTrial, listLedger, revokeGrant } from "../src/lib/reader-auth/entitlements";
import { confirmBatchPrinted, createBatch, issueCodes, issueVirtualCode, redeemCode, setRedeemHalted, type MadeCode, type RedeemResult } from "../src/lib/reader-auth/redeem";
import { countEvents, type Db } from "../src/lib/reader-auth/service";
import { addMonthsMYT, PLAN_MONTHS } from "../src/lib/subscription/periods";

class FixtureFailure extends Error {}
class RollbackFixtures extends Error {}
let passed = 0;
function check(value: unknown, message: string): asserts value {
  if (!value) throw new FixtureFailure(message);
  passed++;
  console.log(`ok: ${message}`);
}

const T0 = new Date("2027-01-01T10:00:00+08:00");
const NOW = new Date(T0.getTime() + 1000);
const codeKey = { keyId: `qa-${randomUUID()}`, key: randomBytes(32) };
const limits = { failsPerAccountPer15Min: 1_000_000, failsPerIpPerHour: 1_000_000, failsAllPerHour: 1_000_000 };
const accounts: string[] = [];

async function account(db: Db): Promise<string> {
  const email = `card-extension-${randomUUID()}@e2e.invalid`;
  const row = await db.insertInto("reader_accounts").values({ email, email_normalized: email }).returning("id").executeTakeFirstOrThrow();
  accounts.push(row.id);
  return row.id;
}

const redeem = (db: Db, accountId: string, code: MadeCode, now = NOW) =>
  redeemCode(db, { codeKey, limits, now }, { accountId, code: code.code, serial: code.serial, ipMac: `qa-${accountId}` });

async function unspent(db: Db, code: MadeCode): Promise<boolean> {
  const row = await db.selectFrom("redeem_codes as c").leftJoin("redemptions as r", "r.code_id", "c.id")
    .select(["c.state", "r.id as redemption"]).where("c.serial", "=", code.serial).executeTakeFirstOrThrow();
  return row.state === "issued" && row.redemption === null;
}

async function rollbackChecks(db: Kysely<Database>) {
  try {
    await db.transaction().execute(async (trx) => {
      await setRedeemHalted(trx, false, "rollback-fixture", NOW);
      for (const currentMonths of PLAN_MONTHS) {
        for (const nextMonths of PLAN_MONTHS) {
          const id = await account(trx);
          const current = await addGrant(trx, { accountId: id, kind: "CARD", grant: { unit: "months", amount: currentMonths }, now: T0 });
          check(current.added, "initial card period added");
          const next = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: nextMonths });
          const spare = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 1 });
          const first = await redeem(trx, id, next);
          check(first.status === "ok" && first.startsAt.getTime() === current.endsAt.getTime() &&
            first.endsAt.getTime() === addMonthsMYT(current.endsAt, nextMonths).getTime(), "one virtual extension starts after the active card");
          const failuresBefore = await countEvents(trx, "redeem_fail", "account", id, T0);
          check((await redeem(trx, id, spare)).status === "card_queued" && await unspent(trx, spare), "a second queued code remains unused");
          check(await countEvents(trx, "redeem_fail", "account", id, T0) === failuresBefore, "a valid queue refusal is not a wrong-code attempt");
          const repeated = await redeem(trx, id, next);
          check(repeated.status === "ok" && repeated.repeat === true && (await listLedger(trx, id)).length === 2, "repeat success remains idempotent while the queue is full");
          check((await redeem(trx, id, spare, new Date(current.endsAt.getTime() - 1))).status === "card_queued", "one millisecond before the next card starts is still full");
          const reopened = await redeem(trx, id, spare, current.endsAt);
          check(reopened.status === "ok" && reopened.startsAt.getTime() === addMonthsMYT(current.endsAt, nextMonths).getTime(), "the same unused code works at the exact next-card boundary");
        }
      }

      const id = await account(trx);
      const batch = await createBatch(trx, { codeKey, now: T0 }, { months: 12, quantity: 3, redeemBy: new Date("2030-01-01T00:00:00+08:00") });
      await confirmBatchPrinted(trx, batch.batchId, T0);
      await issueCodes(trx, { batchId: batch.batchId }, T0);
      check((await redeem(trx, id, batch.codes[0])).status === "ok" && (await redeem(trx, id, batch.codes[1])).status === "ok", "physical cards allow an active period and one extension");
      check((await redeem(trx, id, batch.codes[2])).status === "card_queued" && await unspent(trx, batch.codes[2]), "a blocked physical code is not redeemed");
      const recipient = await account(trx);
      check((await redeem(trx, recipient, batch.codes[2])).status === "ok", "the unused blocked code can instead be given to another reader");
      const queued = (await listLedger(trx, id)).find((period) => period.kind === "CARD" && period.startsAt > NOW);
      check(queued && await revokeGrant(trx, queued.id, "fixture", "fixture cancellation", NOW), "fixture extension cancelled with an audit reason");
      const replacement = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 6 });
      check((await redeem(trx, id, replacement)).status === "ok", "cancelling a queued period frees its slot");
      const expired = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 1 });
      await trx.updateTable("redeem_codes").set({ redeem_by: T0 }).where("serial", "=", expired.serial).execute();
      check((await redeem(trx, id, expired)).status === "expired" && await unspent(trx, expired), "expiry still takes precedence and never consumes a code");
      check((await redeemCode(trx, { codeKey, limits, now: NOW }, { accountId: id, code: expired.code, serial: "invalid", ipMac: "qa-invalid" })).status === "invalid", "a wrong serial never reveals the reader's card-limit result");
      for (const kind of ["SHARED", "ADMIN"] as const) {
        check((await addGrant(trx, { accountId: id, kind, grant: { unit: "months", amount: 12 }, now: NOW })).added, "shared/admin grants are not restricted by the card queue");
      }

      const capAccount = await account(trx);
      await addGrant(trx, { accountId: capAccount, kind: "CARD", grant: { unit: "months", amount: 12 }, now: T0 });
      for (let i = 0; i < 2; i++) await addGrant(trx, { accountId: capAccount, kind: "ADMIN", grant: { unit: "months", amount: 12 }, now: NOW });
      const capped = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 1 });
      const capResult = await redeem(trx, capAccount, capped);
      check(capResult.status === "card_year_limit" && capResult.maximumEndsAt.getTime() === addMonthsMYT(T0, 24).getTime() &&
        await unspent(trx, capped), "other future grants cannot move the active-card year limit forward");

      const trialAccount = await account(trx);
      const trialEnd = new Date(T0.getTime() + 14 * 86400000);
      await addTrial(trx, trialAccount, T0, trialEnd);
      const afterTrial = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 12 });
      const trialResult = await redeem(trx, trialAccount, afterTrial);
      check(trialResult.status === "ok" && trialResult.startsAt.getTime() === trialEnd.getTime(), "the trial retains its complete access period");
      const trialSpare = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 1 });
      check((await redeem(trx, trialAccount, trialSpare)).status === "card_queued", "only one card can wait behind a trial");
      throw new RollbackFixtures();
    });
  } catch (error) {
    if (!(error instanceof RollbackFixtures)) throw error;
  }
  const remaining = await db.selectFrom("reader_accounts").select("id").where("id", "in", accounts).execute();
  const codes = await db.selectFrom("redeem_codes").select("id").where("key_id", "=", codeKey.keyId).execute();
  const ledger = await db.selectFrom("entitlements").select("id").where("account_id", "in", accounts).execute();
  check(remaining.length === 0 && codes.length === 0 && ledger.length === 0, "all account, code and ledger fixtures rolled back");
}

async function raceChecks(db: Kysely<Database>) {
  const setup = await db.transaction().execute(async (trx) => {
    await setRedeemHalted(trx, false, "disposable-race-fixture", NOW);
    const id = await account(trx);
    const active = await addGrant(trx, { accountId: id, kind: "CARD", grant: { unit: "months", amount: 12 }, now: T0 });
    check(active.added, "race fixture has an active card");
    const a = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 6 });
    const b = await issueVirtualCode(trx, { codeKey, now: NOW }, { months: 12 });
    return { id, active, codes: [a, b] };
  });
  const results = await Promise.all(setup.codes.map((code) => redeem(db, setup.id, code)));
  check(results.filter((result) => result.status === "ok").length === 1 && results.filter((result) => result.status === "card_queued").length === 1,
    "two different codes racing for one account create exactly one extension");
  const winnerIndex = results.findIndex((result) => result.status === "ok");
  const spare = setup.codes[1 - winnerIndex];
  const redemptions = await db.selectFrom("redemptions").select("id").where("account_id", "=", setup.id).execute();
  check(await unspent(db, spare) && (await listLedger(db, setup.id)).length === 2 && redemptions.length === 1,
    "the losing code stays unused and there is exactly one redemption and one extension");
  const repeats = await Promise.all(Array.from({ length: 6 }, () => redeem(db, setup.id, setup.codes[winnerIndex])));
  check(repeats.every((result) => result.status === "ok" && result.repeat) && (await listLedger(db, setup.id)).length === 2,
    "six simultaneous repeats return the original success without another grant");
  const extra = await issueVirtualCode(db, { codeKey, now: setup.active.endsAt }, { months: 1 });
  const reopened: RedeemResult[] = await Promise.all([spare, extra].map((code) => redeem(db, setup.id, code, setup.active.endsAt)));
  const finalRedemptions = await db.selectFrom("redemptions").select("id").where("account_id", "=", setup.id).execute();
  check(reopened.filter((result) => result.status === "ok").length === 1 && reopened.filter((result) => result.status === "card_queued").length === 1 &&
    (await listLedger(db, setup.id)).length === 3 && finalRedemptions.length === 2,
    "at the next-card boundary concurrent requests still share one new slot");
  console.log("Committed fixtures remain only on the disposable test branch; no global cleanup was performed.");
}

async function main() {
  const args = process.argv.slice(2);
  const race = args[0] === "--race";
  if (race) args.shift();
  const expectedHost = migrationExpectedHost(args);
  const env = loadMigrationEnvironment(path.join(__dirname, ".."));
  if (race) {
    if (process.env.JALIN_DISPOSABLE_CARD_TEST !== "yes" || !expectedHost || !env.TEST_DATABASE_URL) {
      throw new FixtureFailure("Race mode requires an explicitly approved disposable branch, TEST_DATABASE_URL, JALIN_DISPOSABLE_CARD_TEST=yes and --expected-host.");
    }
    env.DATABASE_URL_UNPOOLED = env.TEST_DATABASE_URL;
    let sharedDevelopment = true;
    try { assertDatabaseAllowedHere(new URL(env.TEST_DATABASE_URL), "TEST_DATABASE_URL", {}); } catch { sharedDevelopment = false; }
    if (sharedDevelopment) throw new FixtureFailure("Race mode refuses the shared development database and localhost.");
  } else {
    // Default checks can never borrow a production/CI bypass from the invoking shell.
    delete env.ALLOW_NON_DEV_DATABASE;
  }
  const connection = migrationConnection(env, expectedHost);
  console.log(`Database host: ${connection.host}`);
  console.log(`Mode: ${race ? "disposable concurrency" : "rollback-only"}`);
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool({ ...connection.poolOptions, max: race ? 4 : 1 }) }) });
  try {
    if (race) await raceChecks(db);
    else await rollbackChecks(db);
    console.log(`${passed} passed, 0 failed; ${race ? "disposable fixtures retained" : "all fixtures rolled back"}.`);
  } finally {
    await db.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof FixtureFailure ? error.message : migrationFailureMessage(error).replace("Migration failed", "Card extension check failed"));
  process.exitCode = 1;
});
