import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getIssueEvents } from "../../../../../../lib/admin/issue-events";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    const events = await getIssueEvents(id);
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}