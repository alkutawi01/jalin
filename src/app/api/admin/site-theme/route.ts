import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { DEFAULT_GROUNDS, GROUNDS, HOME_BLOCKS, isGroundKey, isHomeBlockKey, listSavedGrounds, saveHomeGround } from "../../../../lib/site-theme";

/** GET: the background of each home page block (the saved one, or the default) and the colours that can be picked. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const saved = await listSavedGrounds();
  return NextResponse.json({
    grounds: GROUNDS,
    blocks: HOME_BLOCKS.map((block) => ({ key: block.key, label: block.label, default: block.default, current: saved[block.key] ?? DEFAULT_GROUNDS[block.key] }))
  });
}

/** POST { block, ground }: set the background of one block (choosing its default removes the saved choice). */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { block?: unknown; ground?: unknown };
  if (!isHomeBlockKey(body.block)) return NextResponse.json({ error: "Bahagian laman utama tidak dikenali." }, { status: 400 });
  if (!isGroundKey(body.ground)) return NextResponse.json({ error: "Warna ini bukan warna tema Jalin." }, { status: 400 });
  try {
    await saveHomeGround(body.block, body.ground);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat." }, { status: 500 });
  }
}
