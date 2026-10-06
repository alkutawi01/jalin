import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { RatingError, setRatingStatus } from "../../../../../lib/admin/rating/rating-service";

/** Accept, publish or turn away one rating: { status }. Its numbers and words cannot be changed. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== "string") return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
  try {
    await setRatingStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RatingError) return NextResponse.json({ error: error.message }, { status: /tidak ditemui/.test(error.message) ? 404 : 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
