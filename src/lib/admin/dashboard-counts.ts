/**
 * Counts for the dashboard cards. The big number is what readers can see (published works); works still being
 * written (draft, review, ready) are counted next to it, and archived works are left out. Before, every work of a kind
 * was counted whatever its status, so a single unfinished draft made "Bersiri" read 1 although nothing was published.
 */
export interface WorkCount {
  /** Visible to readers. */
  published: number;
  /** Still being written or checked: draft, review or ready. */
  pending: number;
}

export const WORK_KINDS_ON_DASHBOARD = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"] as const;

/**
 * Episodes are works too, but the card says "Bersiri" and Izzat reads it as titles: two series with three episodes read 3
 * (8 Okt). When a work belongs to a series (workId -> seriesId) the series is counted once per status, not each episode.
 */
export function countWorks(works: Array<{ id?: string; type: string; status: string }>, seriesOf?: Map<string, string>): { total: WorkCount; byType: Record<string, WorkCount> } {
  const empty = (): WorkCount => ({ published: 0, pending: 0 });
  const total = empty();
  const byType: Record<string, WorkCount> = Object.fromEntries(WORK_KINDS_ON_DASHBOARD.map((kind) => [kind, empty()]));
  const seen = new Set<string>();
  for (const work of works) {
    const bucket = work.status === "published" ? "published" : work.status === "archived" ? null : "pending";
    if (!bucket) continue;
    const seriesId = work.id !== undefined ? seriesOf?.get(String(work.id)) : undefined;
    if (seriesId) {
      const key = `${bucket}:${seriesId}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    total[bucket]++;
    if (byType[work.type]) byType[work.type]![bucket]++;
  }
  return { total, byType };
}
