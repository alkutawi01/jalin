import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { isTargetKind, loadRatingTarget } from "../../../../lib/admin/rating/rating-service";

/**
 * The whole text of a work (all its chapters) or of a series (all its episodes) as one plain-text file, in one click.
 * ?kind=work|series&id=  Any work or series, whether or not it may be rated.
 */
export async function GET(request: NextRequest) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const kind = request.nextUrl.searchParams.get("kind");
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!isTargetKind(kind) || !id) return NextResponse.json({ error: "Sasaran tidak sah." }, { status: 400 });
  try {
    const target = await loadRatingTarget(kind, id);
    if (!target) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    return new NextResponse(target.text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${target.fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
