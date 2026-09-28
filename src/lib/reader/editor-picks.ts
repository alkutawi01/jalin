import { getDb, hasDb } from "../db";
import type { WorkType } from "../content/types";
import type { PublicWorkSummary } from "./public-projection";

const EDITOR_PICK_LIMIT = 3;

const CONTENT_WORK_TYPES: readonly string[] = [
  "cerpen",
  "novela",
  "bersiri",
  "fragmen",
  "sinopsis",
];

function isDatabaseMode(): boolean {
  return hasDb() && process.env.CONTENT_SOURCE === "database";
}

function dateOnly(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const iso = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : undefined;
}

/**
 * Editor picks are read straight from the database on every homepage render.
 * They are live curator state (not part of the published revision snapshot,
 * not part of Markdown), so they must not go through the process-level
 * repository cache.
 */
export async function getEditorPickSummaries(): Promise<PublicWorkSummary[]> {
  if (!isDatabaseMode()) return [];

  const db = getDb();

  const rows = await db
    .selectFrom("works")
    .where("status", "=", "published")
    .where("editor_pick", "=", true)
    .select([
      "id",
      "slug",
      "title",
      "type",
      "genre",
      "dek",
      "reading_minutes",
      "published_at",
      "updated_at",
      "editor_pick_rank",
    ])
    .execute();

  const publishedPicks = rows.filter((row) =>
    CONTENT_WORK_TYPES.includes(String(row.type))
  );

  if (publishedPicks.length === 0) return [];

  publishedPicks.sort((a, b) => {
    const rankA = a.editor_pick_rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.editor_pick_rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dateB - dateA;
  });

  const visible = publishedPicks.slice(0, EDITOR_PICK_LIMIT);
  const workIds = visible.map((row) => String(row.id));

  const heroRows = await db
    .selectFrom("visuals")
    .where("work_id", "in", workIds)
    .where("role", "=", "hero")
    .select(["work_id", "src", "alt"])
    .execute();

  const heroByWork = new Map<string, { src: string; alt: string }>();
  for (const hero of heroRows) {
    const workId = String(hero.work_id);
    if (!heroByWork.has(workId)) {
      heroByWork.set(workId, { src: String(hero.src), alt: String(hero.alt || "") });
    }
  }

  return visible.map((row) => {
    const hero = heroByWork.get(String(row.id));
    const publishedAt = dateOnly(row.published_at);
    const updatedAt = dateOnly(row.updated_at);
    return {
      type: String(row.type) as WorkType,
      slug: String(row.slug),
      title: String(row.title),
      ...(row.genre ? { genre: String(row.genre) } : {}),
      ...(row.dek ? { dek: String(row.dek) } : {}),
      ...(row.reading_minutes ? { readingMinutes: Number(row.reading_minutes) } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
      ...(hero ? { hero } : {}),
    } satisfies PublicWorkSummary;
  });
}
