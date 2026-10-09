/**
 * The daily chore (study gate G4): make the signed file of every code and redemption, keep it OUTSIDE the database, remember when that
 * last worked, and sweep away short-lived rows (rate-limit counts and login challenges older than two days). Called by the cron route;
 * the admin can also fetch a fresh file by hand. If keeping the file fails, the chore says so and the admin shows the last time it worked.
 */
import { sql } from "kysely";
import { buildCodesExport } from "./codes-export";
import { loadCodeKey, loadMacKey } from "./primitives";
import type { Db } from "./service";

const KEEP = 30;
const PREFIX = "jalin-kod/eksport-";

export type LastExport = { at: string; lines: number; bytes: number; stored: "blob" | "tidak-disimpan"; url?: string; error?: string };

export async function readLastExport(db: Db): Promise<LastExport | null> {
  const row = await db.selectFrom("reader_switches").select("value").where("key", "=", "last_export").executeTakeFirst();
  if (!row) return null;
  try {
    return JSON.parse(row.value) as LastExport;
  } catch {
    return null;
  }
}

async function remember(db: Db, value: LastExport, now: Date) {
  const text = JSON.stringify(value);
  await db
    .insertInto("reader_switches")
    .values({ key: "last_export", value: text, updated_at: now, updated_by: "cron" })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: text, updated_at: now, updated_by: "cron" }))
    .execute();
}

/** Keep the file in Vercel Blob under an address nobody can guess; keep the newest 30, delete older ones. */
async function keepOutsideDatabase(text: string, now: Date): Promise<{ url?: string; error?: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return { error: "BLOB_READ_WRITE_TOKEN belum ditetapkan: fail tidak disimpan di luar pangkalan data." };
  try {
    const { put, list, del } = await import("@vercel/blob");
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const result = await put(`${PREFIX}${stamp}.ndjson`, text, { access: "public", contentType: "application/x-ndjson", addRandomSuffix: true, token });
    const listed = await list({ prefix: PREFIX, token, limit: 1000 });
    const old = [...listed.blobs].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()).slice(KEEP);
    if (old.length) await del(old.map((b) => b.url), { token });
    return { url: result.url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Muat naik gagal." };
  }
}

export async function runDailyChore(db: Db, now: Date = new Date()): Promise<{ export: LastExport; swept: { events: number; challenges: number } }> {
  const text = await buildCodesExport(db, { codeKey: loadCodeKey(), readerKey: loadMacKey(), now });
  const kept = await keepOutsideDatabase(text, now);
  const info: LastExport = {
    at: now.toISOString(),
    lines: text.split("\n").filter(Boolean).length,
    bytes: Buffer.byteLength(text),
    stored: kept.url ? "blob" : "tidak-disimpan",
    ...(kept.url ? { url: kept.url } : {}),
    ...(kept.error ? { error: kept.error } : {}),
  };
  // Only a file that really reached the outside counts as "last export"; a failed upload leaves the earlier record and is reported.
  if (kept.url) await remember(db, info, now);
  const cutoff = new Date(now.getTime() - 2 * 86400000);
  const events = await sql`DELETE FROM reader_auth_events WHERE at < ${cutoff}`.execute(db);
  const challenges = await sql`DELETE FROM reader_auth_challenges WHERE expires_at < ${cutoff}`.execute(db);
  return { export: info, swept: { events: Number(events.numAffectedRows ?? 0), challenges: Number(challenges.numAffectedRows ?? 0) } };
}

export async function freshExport(db: Db, now: Date = new Date()): Promise<string> {
  return buildCodesExport(db, { codeKey: loadCodeKey(), readerKey: loadMacKey(), now });
}
