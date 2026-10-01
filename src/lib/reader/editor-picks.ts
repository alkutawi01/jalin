import { getDb, hasDb } from "../db";
import type { Work } from "../content/types";
import { projectPublicWorkSummary, type PublicWorkSummary } from "./public-projection";

const EDITOR_PICK_LIMIT = 3;

function isDatabaseMode(): boolean {
  return hasDb() && process.env.CONTENT_SOURCE === "database";
}

export function selectPublishedEditorPicks(ids: string[], publishedWorks: Work[]): PublicWorkSummary[] {
  const byId = new Map(publishedWorks.map((work) => [work.id, work]));
  return ids
    .map((id) => byId.get(id))
    .filter((work): work is Work => Boolean(work))
    .slice(0, EDITOR_PICK_LIMIT)
    .map(projectPublicWorkSummary);
}

/**
 * Curation flags/ranks are live. Card content must come from the public
 * repository's published revision, never the mutable editorial work row.
 */
export async function getEditorPickSummaries(publishedWorks: Work[]): Promise<PublicWorkSummary[]> {
  if (!isDatabaseMode()) return [];

  const db = getDb();

  const rows = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .where("editor_pick", "=", true)
    .select(["id", "editor_pick_rank", "updated_at"])
    .execute();

  rows.sort((a, b) => {
    const rankA = a.editor_pick_rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.editor_pick_rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dateB - dateA;
  });

  return selectPublishedEditorPicks(rows.map((row) => String(row.id)), publishedWorks);
}
