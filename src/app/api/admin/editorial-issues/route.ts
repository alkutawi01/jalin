import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { getEditorialIssues, syncEditorialIssues } from "../../../../lib/admin/editorial-issues";

export async function GET(_request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const url = new URL(_request.url);
    const status = url.searchParams.get("status") || undefined;
    
    const issues = await getEditorialIssues(status || undefined);
    return NextResponse.json({ issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const result = await syncEditorialIssues();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}