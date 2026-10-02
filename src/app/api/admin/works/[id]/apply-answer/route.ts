import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../../lib/db";
import { applyAnswerToWork } from "../../../../../../lib/admin/import/apply-answer";

/** POST /api/admin/works/[id]/apply-answer  { answer } : fills the tabs from one chatbot answer. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { answer?: unknown };
  const answer = typeof body.answer === "string" ? body.answer : "";
  if (!answer.trim()) return NextResponse.json({ error: "Tiada jawapan untuk dibaca. Salin jawapan chatbot dahulu." }, { status: 400 });
  if (answer.length > 400_000) return NextResponse.json({ error: "Jawapan terlalu besar." }, { status: 413 });
  try {
    const report = await applyAnswerToWork(getDb(), id, answer, { id: admin.id, email: admin.email });
    return NextResponse.json(report, { status: report.ok ? 200 : 422 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
