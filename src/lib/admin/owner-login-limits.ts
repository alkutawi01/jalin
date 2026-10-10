import { createHmac } from "node:crypto";
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { Database } from "../db/types";

export const OWNER_LOGIN_LIMITS = { perIp: 5, global: 50, minutes: 15 } as const;
type Db = Kysely<Database> | Transaction<Database>;

/** The owner login is serialised globally and every failed password is counted without storing the IP or password. */
export async function ownerLoginAttempt(db: Db, ip: string, signingKey: string, valid: boolean, now: Date = new Date()): Promise<"ok" | "invalid" | "locked"> {
  const ipHash = createHmac("sha256", signingKey).update(ip.trim().toLowerCase()).digest("hex");
  const run = async (trx: Db) => {
    await sql`SELECT pg_advisory_xact_lock(hashtextextended('jalin:owner-login', 0))`.execute(trx);
    const since = new Date(now.getTime() - OWNER_LOGIN_LIMITS.minutes * 60_000);
    const counts = await trx.selectFrom("admin_activity")
      .select([
        sql<string>`count(*)`.as("all_count"),
        sql<string>`count(*) FILTER (WHERE subject_id = ${ipHash})`.as("ip_count"),
      ])
      .where("action", "=", "auth.owner.failed")
      .where("at", ">=", since)
      .executeTakeFirstOrThrow();
    if (Number(counts.ip_count) >= OWNER_LOGIN_LIMITS.perIp || Number(counts.all_count) >= OWNER_LOGIN_LIMITS.global) return "locked" as const;
    if (valid) return "ok" as const;
    await trx.insertInto("admin_activity").values({ at: now, actor_id: "owner-login", actor_name: "Log masuk pemilik", actor_role: "owner", action: "auth.owner.failed", subject_type: "ip-mac", subject_id: ipHash, work_id: null, summary: "Percubaan log masuk pemilik gagal" }).execute();
    return "invalid" as const;
  };
  return db.isTransaction ? run(db) : (db as Kysely<Database>).transaction().execute((trx) => run(trx));
}
