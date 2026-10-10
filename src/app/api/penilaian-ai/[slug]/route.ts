import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { gateForWork } from "../../../../lib/reader/access-gate";
import { publicRatingDetail } from "../../../../lib/panel/public";

export const dynamic = "force-dynamic";

/**
 * Public, read-only: the component scores and reasons of the AI ratings of a published work, found by its public slug (the internal id
 * never leaves the server). The reader page asks for this only after the reader reaches "Tamat". Nothing but published works; nothing
 * but ratings of the text that is live now.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[0-9a-z-]{1,120}$/.test(slug)) return NextResponse.json({ detail: null }, { status: 404 });
  // The reasons describe the story, so they follow the same paywall as its text.
  try {
    if ((await gateForWork(slug)).state !== "open") return NextResponse.json({ detail: null }, { status: 403 });
  } catch {
    return NextResponse.json({ detail: null }, { status: 404 });
  }
  const db = getDb();
  let workId: string | null = null;
  try {
    const work = await db.selectFrom("works").select(["id", "status"]).where("slug", "=", slug).executeTakeFirst();
    if (work && work.status === "published") workId = work.id;
  } catch {
    workId = null;
  }
  if (!workId) return NextResponse.json({ detail: null }, { status: 404 });
  const detail = await publicRatingDetail(db, workId);
  return NextResponse.json({ detail }, { headers: { "Cache-Control": "no-store" } });
}
