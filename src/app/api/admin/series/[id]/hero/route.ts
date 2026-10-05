import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { clearSeriesHero, setSeriesHero } from "../../../../../../lib/admin/series-hero";

const SESSION_ENDED = "Sesi anda telah tamat. Log masuk semula.";

/** Upload the illustration for a series title page (multipart: file, alt). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fail imej diperlukan." }, { status: 400 });
    const alt = typeof form.get("alt") === "string" ? String(form.get("alt")) : "";
    const result = await setSeriesHero(id, Buffer.from(await file.arrayBuffer()), alt);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, src: result.src }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
  try {
    const { id } = await params;
    const result = await clearSeriesHero(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
