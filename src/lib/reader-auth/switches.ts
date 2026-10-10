/**
 * Switches kept in the database (table reader_switches, migration 030), so the owner can change them from the admin without a deploy:
 *   paywall_on       "yes" while the full text is kept for readers with access (and only when reader accounts are on)
 *   sample:<slug>    "yes" for a work that anyone may read in full, as an example
 */
import { sql } from "kysely";
import type { Db } from "./service";
import { readerAccountsEnabled } from "./enabled";

const PAYWALL_KEY = "paywall_on";
const SAMPLE_PREFIX = "sample:";

export async function isPaywallSwitchOn(db: Db): Promise<boolean> {
  const row = await db.selectFrom("reader_switches").select("value").where("key", "=", PAYWALL_KEY).executeTakeFirst();
  return row?.value === "yes";
}

/** The paywall holds only when accounts are on as well: with accounts off nobody could sign in to get past it. */
export async function paywallOn(db: Db): Promise<boolean> {
  return readerAccountsEnabled() && (await isPaywallSwitchOn(db));
}

export async function setPaywall(db: Db, on: boolean, by: string, now: Date = new Date()): Promise<void> {
  await db
    .insertInto("reader_switches")
    .values({ key: PAYWALL_KEY, value: on ? "yes" : "no", updated_at: now, updated_by: by })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: on ? "yes" : "no", updated_at: now, updated_by: by }))
    .execute();
}

/** Slugs of the works open to everyone as examples. */
export async function sampleSlugs(db: Db): Promise<Set<string>> {
  const rows = await db.selectFrom("reader_switches").select("key").where("key", "like", `${SAMPLE_PREFIX}%`).where("value", "=", "yes").execute();
  return new Set(rows.map((r) => r.key.slice(SAMPLE_PREFIX.length)));
}

export async function setSample(db: Db, slug: string, sample: boolean, by: string, now: Date = new Date()): Promise<void> {
  const key = `${SAMPLE_PREFIX}${slug}`;
  if (!sample) {
    await db.deleteFrom("reader_switches").where("key", "=", key).execute();
    return;
  }
  await db
    .insertInto("reader_switches")
    .values({ key, value: "yes", updated_at: now, updated_by: by })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: "yes", updated_at: now, updated_by: by }))
    .execute();
}

/** Used by tests: how many samples exist. */
export async function countSamples(db: Db): Promise<number> {
  const r = await sql<{ n: string }>`SELECT count(*) AS n FROM reader_switches WHERE key LIKE 'sample:%' AND value = 'yes'`.execute(db);
  return Number(r.rows[0]?.n ?? 0);
}
