import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "kysely";
import { getDb } from "../../../../lib/db";
import { headObject, mediaPublicUrl, objectStoreConfig, putObject } from "../../../../lib/storage/object-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One-off move of the pictures from Vercel Blob to the private R2 bucket (served by /media). Only "Authorization: Bearer <MIGRASI_TOKEN>" (a temporary
 * token set for the move and removed afterwards). Safe to repeat.
 *
 *   ?mode=kira    count the pictures the database points at (nothing is changed)
 *   ?mode=salin   copy every one of them into R2 under the same key (skips what is already there)
 *   ?mode=tulis   rewrite the addresses in the database from Blob to /media, but ONLY when every file is already in R2
 *
 * Blob is not deleted by this route.
 */
const COLUMNS: { table: string; column: string }[] = [
  { table: "visuals", column: "src" },
  { table: "visual_requests", column: "source_asset_url" },
  { table: "visual_requests", column: "source_asset_path" },
  { table: "work_revisions", column: "snapshot" },
  { table: "series", column: "hero_src" },
  { table: "reader_switches", column: "value" },
];
const BLOB_URL = "https://[a-z0-9-]+\\.public\\.blob\\.vercel-storage\\.com/[^\"\\s)\\\\?]+";

function authorised(request: Request): boolean {
  const secret = process.env.MIGRASI_TOKEN?.trim();
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function referencedUrls(db: ReturnType<typeof getDb>): Promise<{ urls: string[]; perColumn: Record<string, number> }> {
  const urls = new Set<string>();
  const perColumn: Record<string, number> = {};
  for (const { table, column } of COLUMNS) {
    const rows = await sql<{ u: string }>`
      SELECT DISTINCT m[1] AS u FROM ${sql.table(table)}, regexp_matches(${sql.ref(column)}::text, ${`(${BLOB_URL})`}, 'g') AS m`.execute(db);
    perColumn[`${table}.${column}`] = rows.rows.length;
    rows.rows.forEach((r) => urls.add(r.u));
  }
  return { urls: [...urls], perColumn };
}

const keyOf = (url: string) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));

export async function GET(request: Request) {
  if (!authorised(request)) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const cfg = objectStoreConfig();
  if (!cfg) return NextResponse.json({ ok: false, error: "OBJECT_STORAGE_* belum ditetapkan." }, { status: 500 });
  const mode = new URL(request.url).searchParams.get("mode") ?? "kira";
  const db = getDb();
  try {
    const { urls, perColumn } = await referencedUrls(db);
    if (mode === "kira") return NextResponse.json({ ok: true, mode, files: urls.length, perColumn });

    if (mode === "salin") {
      let copied = 0, skipped = 0, bytes = 0;
      const failed: string[] = [];
      for (const url of urls) {
        const key = keyOf(url);
        try {
          const there = await headObject(cfg, key);
          if (there && there.size > 0) { skipped++; continue; }
          const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
          if (!res.ok) { failed.push(`${key} (${res.status})`); continue; }
          const body = Buffer.from(await res.arrayBuffer());
          const put = await putObject(cfg, key, body, res.headers.get("content-type") ?? "application/octet-stream");
          if (!put.ok) { console.error("[pindah-media]", key, put.error);
            failed.push(`${key} (gagal simpan)`); continue; }
          copied++; bytes += body.length;
        } catch (error) {
          console.error("[pindah-media]", key, error);
          failed.push(`${key} (gagal)`);
        }
      }
      return NextResponse.json({ ok: failed.length === 0, mode, files: urls.length, copied, skipped, bytes, failed });
    }

    if (mode === "tulis") {
      const missing: string[] = [];
      for (const url of urls) {
        const there = await headObject(cfg, keyOf(url));
        if (!there || there.size === 0) missing.push(keyOf(url));
      }
      if (missing.length) return NextResponse.json({ ok: false, mode, error: "Ada fail yang belum ada di R2; tiada apa diubah.", missing }, { status: 409 });
      const base = mediaPublicUrl("").replace(/\/$/, "");
      const changed: Record<string, number> = {};
      for (const { table, column } of COLUMNS) {
        const type = await sql<{ data_type: string }>`SELECT data_type FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}`.execute(db);
        const isJson = type.rows[0]?.data_type === "jsonb" || type.rows[0]?.data_type === "json";
        const pattern = "https://[a-z0-9-]+\\.public\\.blob\\.vercel-storage\\.com/";
        const replacement = `${base}/`;
        const result = isJson
          ? await sql`UPDATE ${sql.table(table)} SET ${sql.ref(column)} = regexp_replace(${sql.ref(column)}::text, ${pattern}, ${replacement}, 'g')::jsonb WHERE ${sql.ref(column)}::text ~ ${pattern}`.execute(db)
          : await sql`UPDATE ${sql.table(table)} SET ${sql.ref(column)} = regexp_replace(${sql.ref(column)}, ${pattern}, ${replacement}, 'g') WHERE ${sql.ref(column)} ~ ${pattern}`.execute(db);
        changed[`${table}.${column}`] = Number(result.numAffectedRows ?? 0);
      }
      return NextResponse.json({ ok: true, mode, files: urls.length, changed });
    }
    return NextResponse.json({ ok: false, error: "mode tidak dikenali" }, { status: 400 });
  } catch (error) {
    console.error("[pindah-media]", error);
    return NextResponse.json({ ok: false, error: "Gagal." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
