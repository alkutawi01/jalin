import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../../../../lib/db";
import { fillEpisodeFromSeries } from "../../../../../../../../lib/admin/series-inheritance";

/**
 * POST /api/admin/series/[id]/entries/[workId]/inherit
 * Fills what an episode of the series is still missing (genre, audience, credits, characters, places) from the series and the
 * episodes before it. Only fills; nothing already written is replaced. Refuses published and archived episodes.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; workId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }
    if (!hasDb()) {
      return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });
    }
    const { id, workId } = await params;
    const result = await getDb().transaction().execute((trx) => fillEpisodeFromSeries(trx, id, workId));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui") ? 404 : message.includes("tidak boleh") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
