import { NextRequest, NextResponse } from "next/server";
import { getEditorialReport } from "../../../../lib/admin/editorial-health";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { saveAuditRun } from "../../../../lib/admin/audit-history";
import { syncEditorialIssues } from "../../../../lib/admin/editorial-issues";

export async function GET(_request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const report = await getEditorialReport();
    
    // Save audit run
    try {
      await saveAuditRun();
    } catch (e) {
      // Ignore save errors
    }
    
    // Sync editorial issues
    try {
      await syncEditorialIssues();
    } catch (e) {
      // Ignore sync errors
    }
    
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}