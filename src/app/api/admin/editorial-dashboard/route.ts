import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { getEditorialHealth } from "../../../../lib/admin/editorial-health";
import { getEditorialIssues } from "../../../../lib/admin/editorial-issues";
import { getAuditHistory } from "../../../../lib/admin/audit-history";

export async function GET(_request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const [health, issues, history] = await Promise.all([
      getEditorialHealth(),
      getEditorialIssues(),
      getAuditHistory(10),
    ]);
    
    // Aggregate issues
    const issuesByType: Record<string, number> = {};
    const issuesByStatus: Record<string, number> = {};
    
    for (const issue of issues) {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      issuesByStatus[issue.status] = (issuesByStatus[issue.status] || 0) + 1;
    }
    
    return NextResponse.json({
      health,
      issues: {
        total: issues.length,
        byType: issuesByType,
        byStatus: issuesByStatus,
      },
      history: {
        recent: history.length,
        runs: history.slice(0, 5),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}