import { getDb } from "../db";

/** The editorial post the public Editorial page shows for a person (migration 031). */
export type ContributorProfileResult = { ok: true } | { ok: false; status: number; error: string };

export const POST_TITLE_MAX = 80;
export const POST_DUTY_MAX = 240;

const NOT_MIGRATED = "Pangkalan data belum dikemas kini untuk profil penyumbang. Pentadbir teknikal perlu menjalankan migrasi 031 dahulu.";

function isMissingColumn(error: unknown): boolean {
  return /post_title|post_duty|column .* does not exist/i.test(error instanceof Error ? error.message : String(error));
}

/** Set (or clear, with empty text) the editorial post of a person. A post needs both its title and what it is responsible for. */
export async function setContributorPost(slug: string, title: string, duty: string): Promise<ContributorProfileResult> {
  const t = title.trim();
  const d = duty.trim();
  if (t.length > POST_TITLE_MAX) return { ok: false, status: 400, error: `Jawatan terlalu panjang (maksimum ${POST_TITLE_MAX} aksara).` };
  if (d.length > POST_DUTY_MAX) return { ok: false, status: 400, error: `Tanggungjawab terlalu panjang (maksimum ${POST_DUTY_MAX} aksara).` };
  if (!t !== !d) return { ok: false, status: 400, error: "Isi kedua-dua jawatan dan tanggungjawab, atau kosongkan kedua-duanya." };
  try {
    const result = await getDb()
      .updateTable("contributors")
      .where("slug", "=", slug)
      .set({ post_title: t || null, post_duty: d || null, updated_at: new Date().toISOString() })
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) return { ok: false, status: 404, error: "Penyumbang tidak ditemui." };
    return { ok: true };
  } catch (error) {
    if (isMissingColumn(error)) return { ok: false, status: 409, error: NOT_MIGRATED };
    throw error;
  }
}
