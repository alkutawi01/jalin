import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { DEFAULT_AUDIENCE_BANDS, loadAudienceBands, saveAudienceBands } from "../../../../lib/audience";
import { hasDb } from "../../../../lib/db";

/** GET: the audience bands (what an editor ticks on a work) and the default ones. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  return NextResponse.json({ bands: await loadAudienceBands(), defaults: DEFAULT_AUDIENCE_BANDS });
}

/** POST { bands }: replace the audience bands. */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { bands?: unknown };
  try {
    return NextResponse.json({ bands: await saveAudienceBands(body.bands) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat.";
    const user = /^(Sekurang|Paling|Peringkat)/.test(message);
    return NextResponse.json({ error: user ? message : "Gagal menyimpan peringkat." }, { status: user ? 400 : 500 });
  }
}
