import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { can, roleFromClaim } from "../../../../../../lib/admin/permissions";
import { applyAssistantAnswer } from "../../../../../../lib/admin/authoring/apply-answer";
import { logActivity } from "../../../../../../lib/admin/activity";
import { processEditorAnswer } from "../../../../../../lib/admin/authoring/editor-answer-service";
import { publicErrorMessage } from "../../../../../../lib/admin/api-errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentAdmin();
    const role = roleFromClaim(admin?.role);
    if (!admin || !role) return NextResponse.json({ error: "Sesi tamat. Log masuk semula." }, { status: 401 });
    if (!can(role, "work.write") || admin.mustChangePassword) return NextResponse.json({ error: "Tiada kebenaran." }, { status: 403 });
    const body = await request.json();
    if (body.mode === "editor") {
      const id = (await params).id;
      const result = await processEditorAnswer(id, body, admin, { source: can(role, "source.manage"), credits: can(role, "credit.write"), glossary: can(role, "glossary.write") });
      if (body.action === "apply") await logActivity({ action: "work.update", subjectType: "work", subjectId: id, workId: id, summary: `Jawapan AI ${body.scope} ditampal editor.` });
      return NextResponse.json(result);
    }
    if (typeof body.text !== "string" || typeof body.expectedText !== "string" || typeof body.scope !== "string" || (body.preserve !== undefined && (!Array.isArray(body.preserve) || body.preserve.some((v: unknown) => typeof v !== "string")))) return NextResponse.json({ error: "Bentuk jawapan tidak sah." }, { status: 400 });
    const id = (await params).id;
    const result = await applyAssistantAnswer(id, body, admin, can(role, "source.manage"));
    await logActivity({ action: "work.update", subjectType: "work", subjectId: id, workId: id, summary: `Mengisi cadangan bot sembang (${body.scope}) selepas pengesahan editor.` });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `${publicErrorMessage(error, "Tidak dapat mengisi jawapan.")} Semua perubahan transaksi dibatalkan.` }, { status: 400 });
  }
}
