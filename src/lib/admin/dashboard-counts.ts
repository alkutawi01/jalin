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

export function countWorks(works: Array<{ type: string; status: string }>): { total: WorkCount; byType: Record<string, WorkCount> } {
  const empty = (): WorkCount => ({ published: 0, pending: 0 });
  const total = empty();
  const byType: Record<string, WorkCount> = Object.fromEntries(WORK_KINDS_ON_DASHBOARD.map((kind) => [kind, empty()]));
  for (const work of works) {
    const bucket = work.status === "published" ? "published" : work.status === "archived" ? null : "pending";
    if (!bucket) continue;
    total[bucket]++;
    if (byType[work.type]) byType[work.type]![bucket]++;
  }
  return { total, byType };
}
