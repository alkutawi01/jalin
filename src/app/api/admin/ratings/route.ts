import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { RatingError, getRatingState, isTargetKind, previewRating, saveRating } from "../../../../lib/admin/rating/rating-service";

const EXPIRED = { error: "Sesi anda telah tamat. Log masuk semula." };

/** The rating page of one work or series: what it is, the instruction to copy, and the ratings it has. ?kind=work|series&id= */
export async function GET(request: NextRequest) {
  if (!(await getCurrentAdmin())) return NextResponse.json(EXPIRED, { status: 401 });
  const kind = request.nextUrl.searchParams.get("kind");
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!isTargetKind(kind) || !id) return NextResponse.json({ error: "Sasaran penilaian tidak sah." }, { status: 400 });
  try {
    const state = await getRatingState(kind, id);
    if (!state) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}

/** Paste in a chatbot's answer: { kind, id, raw, dryRun? }. With dryRun it is only read and shown back; without, it is kept. */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json(EXPIRED, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !isTargetKind(body.kind) || typeof body.id !== "string" || typeof body.raw !== "string") {
    return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
  }
  try {
    if (body.dryRun === true) {
      const parsed = await previewRating(body.kind, body.id, body.raw);
      return NextResponse.json(parsed, { status: parsed.ok ? 200 : 422 });
    }
    const saved = await saveRating(body.kind, body.id, body.raw, admin.email);
    return NextResponse.json({ ok: true, ...saved, state: await getRatingState(body.kind, body.id) });
  } catch (error) {
    if (error instanceof RatingError) return NextResponse.json({ ok: false, error: error.message, errors: error.errors }, { status: 422 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
