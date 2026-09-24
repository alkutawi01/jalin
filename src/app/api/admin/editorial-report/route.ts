import { NextRequest, NextResponse } from "next/server";
import { getEditorialReport } from "../../../../lib/admin/editorial-health";
import { getCurrentAdmin } from "../../../../lib/admin/auth";

export async function GET(_request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const report = await getEditorialReport();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}