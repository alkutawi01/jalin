import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { getAuditHistory } from "../../../../../lib/admin/audit-history";

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
    const history = await getAuditHistory(50);
    const run = history.find((r: any) => r.id === id);
    
    if (!run) {
      return NextResponse.json({ error: "Audit run not found" }, { status: 404 });
    }
    
    // Find previous run for comparison
    const runIndex = history.findIndex((r: any) => r.id === id);
    const previousRun = runIndex < history.length - 1 ? history[runIndex + 1] : null;
    
    let comparison = null;
    if (previousRun) {
      comparison = {
        previousRunId: previousRun.id,
        previousGeneratedAt: previousRun.generatedAt,
        changes: Object.keys(run.summary).map(category => ({
          category,
          current: run.summary[category],
          previous: previousRun.summary[category],
          changed: run.summary[category] !== previousRun.summary[category],
        })),
      };
    }
    
    return NextResponse.json({ run, comparison });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}