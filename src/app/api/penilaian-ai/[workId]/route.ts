import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { publicRatingDetail } from "../../../../lib/panel/public";

export const dynamic = "force-dynamic";

/**
 * Public, read-only: the component scores and reasons of the AI ratings of a published work. The reader page asks for this only after the
 * reader reaches "Tamat". Nothing but published works; nothing but ratings of the text that is live now.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ workId: string }> }) {
  const { workId } = await params;
  if (!/^[0-9a-zA-Z_-]{1,64}$/.test(workId)) return NextResponse.json({ detail: null }, { status: 404 });
  const db = getDb();
  try {
    const work = await db.selectFrom("works").select(["id", "status"]).where("id", "=", workId).executeTakeFirst();
    if (!work || work.status !== "published") return NextResponse.json({ detail: null }, { status: 404 });
  } catch {
    return NextResponse.json({ detail: null }, { status: 404 });
  }
  const detail = await publicRatingDetail(db, workId);
  return NextResponse.json({ detail }, { headers: { "Cache-Control": "no-store" } });
}
