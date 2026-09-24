import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { getRevision } from "@/lib/admin/revision-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;
  const revision = await getRevision(revisionId);
  if (!revision || revision.work_id !== id) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }

  // TODO: Implement proper diff logic
  const snapshot = typeof revision.snapshot === "string" ? JSON.parse(revision.snapshot) : revision.snapshot;
  return NextResponse.json({ snapshot });
}