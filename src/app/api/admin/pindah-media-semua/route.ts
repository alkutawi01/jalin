import { NextResponse } from "next/server";
import { sql } from "kysely";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { getDb } from "../../../../lib/db";
import { headObject, mediaPublicUrl, objectStoreConfig, putObject } from "../../../../lib/storage/object-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * TEMPORARY. The last sweep of Vercel Blob addresses before the store is deleted: scans EVERY text and JSON column of the public schema
 * (not a fixed list), then ?mode=salin copies what is missing to R2 and ?mode=tulis rewrites the addresses. Admin session only. Remove after use.
 */
const PATTERN_MATCH = "https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/[^\"\s)\\?|]+";
const PATTERN_HOST = "https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/";
const keyOf = (url: string) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const cfg = objectStoreConfig();
  if (!cfg) return NextResponse.json({ ok: false, error: "OBJECT_STORAGE_* belum ditetapkan." }, { status: 500 });
  const mode = new URL(request.url).searchParams.get("mode") ?? "kira";
  const db = getDb();
  try {
    const cols = (await sql<{ table_name: string; column_name: string; data_type: string }>`
      SELECT c.table_name, c.column_name, c.data_type FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')`.execute(db)).rows;
    const found: { table: string; column: string; type: string; n: number }[] = [];
    const urls = new Set<string>();
    for (const { table_name: table, column_name: column, data_type: type } of cols) {
      const rows = await sql<{ u: string }>`SELECT DISTINCT m[1] AS u FROM ${sql.table(table)}, regexp_matches(${sql.ref(column)}::text, ${`(${PATTERN_MATCH})`}, 'g') AS m`.execute(db);
      if (rows.rows.length) { found.push({ table, column, type, n: rows.rows.length }); rows.rows.forEach((r) => urls.add(r.u)); }
    }
    if (mode === "kira") return NextResponse.json({ ok: true, mode, scanned: cols.length, files: urls.size, found });

    if (mode === "salin") {
      let copied = 0, skipped = 0;
      const failed: string[] = [];
      for (const url of urls) {
        const key = keyOf(url);
        try {
          const there = await headObject(cfg, key);
          if (there && there.size > 0) { skipped++; continue; }
          const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
          if (!res.ok) { failed.push(`${key} (${res.status})`); continue; }
          const put = await putObject(cfg, key, Buffer.from(await res.arrayBuffer()), res.headers.get("content-type") ?? "application/octet-stream");
          if (put.ok) copied++; else failed.push(`${key} (gagal simpan)`);
        } catch {
          failed.push(`${key} (gagal)`);
        }
      }
      return NextResponse.json({ ok: failed.length === 0, mode, files: urls.size, copied, skipped, failed });
    }

    if (mode === "tulis") {
      const missing: string[] = [];
      for (const url of urls) { const there = await headObject(cfg, keyOf(url)); if (!there || there.size === 0) missing.push(keyOf(url)); }
      if (missing.length) return NextResponse.json({ ok: false, mode, error: "Ada fail belum ada di R2; tiada apa diubah.", missing }, { status: 409 });
      const replacement = `${mediaPublicUrl("").replace(/\/$/, "")}/`;
      const changed: Record<string, number> = {};
      for (const { table, column, type } of found) {
        const isJson = type === "json" || type === "jsonb";
        const cast = type === "json" ? sql`::json` : sql`::jsonb`;
        const result = isJson
          ? await sql`UPDATE ${sql.table(table)} SET ${sql.ref(column)} = regexp_replace(${sql.ref(column)}::text, ${PATTERN_HOST}, ${replacement}, 'g')${cast} WHERE ${sql.ref(column)}::text ~ ${PATTERN_HOST}`.execute(db)
          : await sql`UPDATE ${sql.table(table)} SET ${sql.ref(column)} = regexp_replace(${sql.ref(column)}, ${PATTERN_HOST}, ${replacement}, 'g') WHERE ${sql.ref(column)} ~ ${PATTERN_HOST}`.execute(db);
        changed[`${table}.${column}`] = Number(result.numAffectedRows ?? 0);
      }
      return NextResponse.json({ ok: true, mode, files: urls.size, changed });
    }
    return NextResponse.json({ ok: false, error: "mode tidak dikenali" }, { status: 400 });
  } catch (error) {
    console.error("[pindah-media-semua]", error);
    return NextResponse.json({ ok: false, error: "Gagal." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
