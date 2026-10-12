import { NextRequest, NextResponse } from "next/server";
import { getDb, hasDb } from "../../../../../../lib/db";

export const dynamic = "force-dynamic";

/**
 * Which series a work belongs to and its episode number, for the heading of the work's editor. The number is the same one the readers
 * see ("Episod 3"): the position the editor gave it in the series. A work that is not an episode answers { series: null }.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDb()) return NextResponse.json({ series: null });
    const row = await getDb()
      .selectFrom("series_entries")
      .innerJoin("series", "series.id", "series_entries.series_id")
      .select(["series.id as seriesId", "series.title as seriesTitle", "series.slug as seriesSlug", "series_entries.position as position"])
      .where("series_entries.work_id", "=", id)
      .executeTakeFirst();
    if (!row) return NextResponse.json({ series: null });
    return NextResponse.json({ series: { id: row.seriesId, title: row.seriesTitle, slug: row.seriesSlug, position: row.position } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
