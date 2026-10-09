import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { clearEditorialHero, setEditorialHero, setEditorialHeroAlt } from "../../../../../lib/editorial-page";

const SESSION_ENDED = "Sesi anda telah tamat. Log masuk semula.";
const failed = (error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });

/** Upload the picture across the top of the Editorial page (multipart: file, alt). */
export async function POST(request: NextRequest) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fail imej diperlukan." }, { status: 400 });
    const alt = typeof form.get("alt") === "string" ? String(form.get("alt")) : "";
    const result = await setEditorialHero(Buffer.from(await file.arrayBuffer()), alt);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, src: result.src }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}

/** Change only the text that describes the picture: { alt }. */
export async function PATCH(request: NextRequest) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { alt?: unknown };
    await setEditorialHeroAlt(typeof body.alt === "string" ? body.alt : "");
    return NextResponse.json({ success: true });
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE() {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
  try {
    await clearEditorialHero();
    return NextResponse.json({ success: true });
  } catch (error) {
    return failed(error);
  }
}
