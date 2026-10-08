import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { BODY_PX, HEADING_EM, listSavedTypography, saveReaderTypography, TypographyInputError } from "../../../../lib/reader/reader-typography";

const SESSION_ENDED = "Sesi anda telah tamat. Log masuk semula.";

/** GET: the saved text and sub-heading sizes (null = Jalin's own sizes) and the limits that can be set. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
  const saved = await listSavedTypography();
  return NextResponse.json({ ...saved, limits: { bodyPx: BODY_PX, headingEm: HEADING_EM } });
}

/** POST { bodyPx, headingEm }: set both sizes for every work; null or an empty value goes back to Jalin's own size. Chief editor and owner only (see permissions.ts). */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { bodyPx?: unknown; headingEm?: unknown } | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
  try {
    const saved = await saveReaderTypography({ bodyPx: body.bodyPx, headingEm: body.headingEm });
    return NextResponse.json({ ok: true, ...saved });
  } catch (error) {
    if (error instanceof TypographyInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[ReaderTypographyAPI] Error:", error);
    return NextResponse.json({ error: "Saiz tidak dapat disimpan." }, { status: 500 });
  }
}
