import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../../../lib/admin/auth";
import { revertRevision } from "../../../../../../../../lib/admin/revision-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, revisionId } = await params;
    const result = await revertRevision(id, revisionId, { id: admin.id, email: admin.email });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}