import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { CATEGORY_TYPES, DEFAULT_CATEGORY_INTROS, isCategoryType, listSavedCategoryIntros, saveCategoryIntro } from "../../../../lib/site-copy";

/** GET: the intro sentence of each list page, the saved one and the default. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const saved = await listSavedCategoryIntros();
  return NextResponse.json({ intros: CATEGORY_TYPES.map((type) => ({ type, saved: saved[type], default: DEFAULT_CATEGORY_INTROS[type] })) });
}

/** POST { type, text }: set the intro of one list page (empty goes back to the default). */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { type?: unknown; text?: unknown };
  if (!isCategoryType(body.type)) return NextResponse.json({ error: "Jenis halaman tidak dikenali." }, { status: 400 });
  if (typeof body.text !== "string") return NextResponse.json({ error: "Teks diperlukan." }, { status: 400 });
  try {
    await saveCategoryIntro(body.type, body.text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Ayat") ? 400 : 500 });
  }
}
