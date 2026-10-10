/**
 * The picture behind the first screen of /mula: ONE ready-made image (a wall of the works' own pictures), made once a month by the
 * scheduled job on the 1st and kept as it is until the next one. The page loads this single small file instead of a dozen originals.
 * Where it lives: Vercel Blob when the store is configured (live site), otherwise public/generated (local development).
 * The address and the month are kept in reader_switches under "mula_wall" as "<address>|<YYYY-MM>".
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Db } from "../reader-auth/service";

const KEY = "mula_wall";
const COLS = 6;
const ROWS = 2;
const TILE_W = 300;
const TILE_H = 200;
const GAP = 10;

export type Wall = { url: string; month: string };

export async function getWall(db: Db): Promise<Wall | null> {
  const row = await db.selectFrom("reader_switches").select("value").where("key", "=", KEY).executeTakeFirst();
  if (!row?.value) return null;
  const [url, month] = row.value.split("|");
  if (!url || !month) return null;
  if (!(url.startsWith("https://") || url.startsWith("/generated/"))) return null;
  return { url, month };
}

async function saveWallRecord(db: Db, wall: Wall, by: string, now: Date) {
  const value = `${wall.url}|${wall.month}`;
  await db
    .insertInto("reader_switches")
    .values({ key: KEY, value, updated_at: now, updated_by: by })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value, updated_at: now, updated_by: by }))
    .execute();
}

/** Pictures are named by the site's own paths (/visuals/...) or by a full https address (Vercel Blob). */
async function loadSource(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith("https://")) {
      const response = await fetch(src);
      return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    }
    if (src.startsWith("/") && !src.includes("..")) return await fs.readFile(path.join(process.cwd(), "public", src));
  } catch {
    /* skip this picture */
  }
  return null;
}

/** A small, stable shuffle by month, so each month shows a different mix but the same one all month. */
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Compose the wall: up to 12 pictures cropped to the same shape, side by side, as one WebP of a modest size. */
export async function composeWall(sources: string[], month: string): Promise<Buffer | null> {
  const sharp = (await import("sharp")).default;
  const picked = shuffled(sources, month).slice(0, COLS * ROWS);
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  for (const src of picked) {
    const raw = await loadSource(src);
    if (!raw) continue;
    try {
      const input = await sharp(raw).resize(TILE_W, TILE_H, { fit: "cover", position: "attention" }).toBuffer();
      const i = tiles.length;
      tiles.push({ input, left: (i % COLS) * (TILE_W + GAP), top: Math.floor(i / COLS) * (TILE_H + GAP) });
    } catch {
      /* an unreadable picture is left out */
    }
  }
  if (tiles.length < 3) return null;
  const width = COLS * TILE_W + (COLS - 1) * GAP;
  const height = ROWS * TILE_H + (ROWS - 1) * GAP;
  return sharp({ create: { width, height, channels: 3, background: "#f7ece4" } })
    .composite(tiles)
    .webp({ quality: 68 })
    .toBuffer();
}

async function store(buffer: Buffer, month: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    const { put } = await import("@vercel/blob");
    const result = await put(`assets/mula/wall-${month}.webp`, buffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return result.url;
  }
  // Local development: the site's own public folder (ignored by git).
  const dir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `mula-wall-${month}.webp`), buffer);
  return `/generated/mula-wall-${month}.webp`;
}

export type WallResult = { ok: true; wall: Wall; bytes: number; pictures: number } | { ok: false; error: string };

/** Build this month's wall from the given picture sources, store it and remember it. */
export async function generateWall(db: Db, sources: string[], by: string, now: Date = new Date()): Promise<WallResult> {
  const month = now.toISOString().slice(0, 7);
  const unique = [...new Set(sources.filter(Boolean))];
  if (unique.length < 3) return { ok: false, error: "Kurang daripada tiga gambar karya tersedia." };
  const buffer = await composeWall(unique, month);
  if (!buffer) return { ok: false, error: "Gambar tidak dapat digabungkan." };
  const url = await store(buffer, month);
  const wall = { url, month };
  await saveWallRecord(db, wall, by, now);
  return { ok: true, wall, bytes: buffer.length, pictures: Math.min(unique.length, COLS * ROWS) };
}
