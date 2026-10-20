import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getIssueEvents } from "../../../../../../lib/admin/issue-events";
import { publicErrorMessage } from "../../../../../../lib/admin/api-errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }
    
    const { id } = await params;
    const events = await getIssueEvents(id);
    return NextResponse.json({ events });
  } catch (error) {
    const message = publicErrorMessage(error, "Ralat tidak diketahui.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}