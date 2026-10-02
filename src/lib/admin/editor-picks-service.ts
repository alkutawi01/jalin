import { getDb } from "../db";

/** The homepage carousel shows at most this many picks, newest first. */
export const EDITOR_PICK_LIMIT = 5;

export interface PickWork {
  id: string;
  title: string;
  type: string;
  slug: string;
  /** 1-based position when the work is a pick, otherwise null. */
  rank: number | null;
  reason: string;
}

export interface PickState {
  picks: PickWork[];
  others: PickWork[];
}

/** Every published work, split into the current picks (in order) and the rest. */
export async function getPickState(): Promise<PickState> {
  const rows = await getDb()
    .selectFrom("works")
    .where("status", "=", "published")
    .select(["id", "title", "type", "slug", "editor_pick", "editor_pick_rank", "editor_pick_reason", "updated_at", "published_at"])
    .execute();
  const toWork = (r: (typeof rows)[number]): PickWork => ({
    id: String(r.id),
    title: String(r.title),
    type: String(r.type),
    slug: String(r.slug),
    rank: r.editor_pick ? r.editor_pick_rank ?? null : null,
    reason: r.editor_pick_reason ?? ""
  });
  const picked = rows
    .filter((r) => r.editor_pick)
    .sort((a, b) => String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")))
    .map(toWork)
    .map((work, index) => ({ ...work, rank: index + 1 }));
  const others = rows
    .filter((r) => !r.editor_pick)
    .sort((a, b) => String(b.published_at ?? b.updated_at ?? "").localeCompare(String(a.published_at ?? a.updated_at ?? "")))
    .map(toWork);
  return { picks: picked, others };
}

/** Replace the whole set of picks. Order in the array is the position on the homepage. */
export async function savePicks(picks: { id: string; reason?: string }[]): Promise<void> {
  if (picks.length > EDITOR_PICK_LIMIT) {
    throw new Error(`Pilihan Editor maksimum ${EDITOR_PICK_LIMIT} karya. Buang satu dahulu.`);
  }
  const ids = picks.map((p) => p.id);
  if (new Set(ids).size !== ids.length) throw new Error("Karya yang sama dipilih lebih daripada sekali.");
  for (const p of picks) {
    if ((p.reason ?? "").length > 300) throw new Error("Sebab pilihan maksimum 300 aksara.");
  }
  await getDb().transaction().execute(async (trx) => {
    if (ids.length > 0) {
      const found = await trx.selectFrom("works").where("id", "in", ids).where("status", "=", "published").select("id").execute();
      if (found.length !== ids.length) throw new Error("Hanya karya yang sudah terbit boleh dipilih.");
    }
    await trx
      .updateTable("works")
      .where((eb) => eb.or([eb("editor_pick", "=", true), eb("editor_pick_rank", "is not", null)]))
      .set({ editor_pick: false, editor_pick_rank: null, editor_pick_reason: null })
      .execute();
    for (const [index, p] of picks.entries()) {
      await trx
        .updateTable("works")
        .where("id", "=", p.id)
        .set({ editor_pick: true, editor_pick_rank: index + 1, editor_pick_reason: (p.reason ?? "").trim() || null })
        .execute();
    }
  });
}
