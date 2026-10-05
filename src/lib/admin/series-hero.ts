import { getDb } from "../db";
import { detectImageType, MAX_MANUAL_UPLOAD_BYTES } from "./visual-generation/manual-upload";
import { storeVisualAssetBytes } from "./visual-generation/asset-storage";

export type SeriesHeroResult = { ok: true; src: string } | { ok: false; status: number; error: string };
export type SeriesHeroClearResult = { ok: true } | { ok: false; status: number; error: string };

/** A stable number per series for the storage key (the content hash in the key keeps versions apart). */
function storageId(seriesId: string): number {
  let h = 0;
  for (let i = 0; i < seriesId.length; i++) h = (h * 31 + seriesId.charCodeAt(i)) >>> 0;
  return 5_000_000 + (h % 1_000_000);
}

function isMissingColumn(error: unknown): boolean {
  return /hero_(src|alt)|column .* does not exist/i.test(error instanceof Error ? error.message : String(error));
}

export async function setSeriesHero(seriesId: string, bytes: Buffer, alt: string): Promise<SeriesHeroResult> {
  if (bytes.length === 0) return { ok: false, status: 400, error: "Fail imej diperlukan." };
  if (bytes.length > MAX_MANUAL_UPLOAD_BYTES) return { ok: false, status: 413, error: "Imej melebihi 10 MB." };
  const type = detectImageType(bytes);
  if (!type) return { ok: false, status: 400, error: "Hanya imej PNG, JPEG atau WebP diterima." };

  const db = getDb();
  const series = await db.selectFrom("series").where("id", "=", seriesId).select("id").executeTakeFirst();
  if (!series) return { ok: false, status: 404, error: "Siri tidak ditemui." };

  const stored = await storeVisualAssetBytes(bytes, storageId(seriesId), type.mime);
  if (!stored.finalized || !stored.stableAssetPath) {
    return { ok: false, status: 503, error: "Imej tidak dapat disimpan secara kekal. Semak tetapan storan imej." };
  }
  try {
    await db
      .updateTable("series")
      .where("id", "=", seriesId)
      .set({ hero_src: stored.stableAssetPath, hero_alt: alt.trim(), updated_at: new Date().toISOString() } as never)
      .execute();
  } catch (error) {
    if (isMissingColumn(error)) {
      return { ok: false, status: 409, error: "Pangkalan data belum dikemas kini untuk gambar siri. Pentadbir teknikal perlu menjalankan migrasi 020 dahulu." };
    }
    throw error;
  }
  return { ok: true, src: stored.stableAssetPath };
}

export async function clearSeriesHero(seriesId: string): Promise<SeriesHeroClearResult> {
  try {
    return await getDb().transaction().execute(async (trx) => {
      const series = await trx.selectFrom("series").where("id", "=", seriesId).select("id").forUpdate().executeTakeFirst();
      if (!series) return { ok: false, status: 404, error: "Siri tidak ditemui." };
      const publishedEpisode = await trx.selectFrom("series_entries")
        .innerJoin("works", "works.id", "series_entries.work_id")
        .where("series_entries.series_id", "=", seriesId)
        .where("works.status", "=", "published")
        .select("works.id")
        .executeTakeFirst();
      if (publishedEpisode) return { ok: false, status: 409, error: "Gambar siri tidak boleh dibuang selagi siri mempunyai episod terbit. Gantikan gambar jika perlu." };
      await trx.updateTable("series")
        .where("id", "=", seriesId)
        .set({ hero_src: null, hero_alt: null, updated_at: new Date().toISOString() } as never)
        .execute();
      return { ok: true };
    });
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    return { ok: false, status: 409, error: "Pangkalan data belum dikemas kini untuk gambar siri. Pentadbir teknikal perlu menjalankan migrasi 020 dahulu." };
  }
}
