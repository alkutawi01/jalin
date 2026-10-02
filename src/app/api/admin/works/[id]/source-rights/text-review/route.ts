import { NextRequest, NextResponse } from "next/server";
import { confirmFragmenMalayText } from "../../../../../../../lib/admin/source-rights";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";

/** Human confirmation that a Fragmen's displayed text is Bahasa Melayu. Reviewer and time come from the session. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const view = await confirmFragmenMalayText(id, body?.confirmed === true, { id: admin.id, email: admin.email });
    return NextResponse.json(view);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: message.includes("tidak ditemui") ? 404 : message.includes("hanya untuk") ? 400 : 500 });
  }
}
