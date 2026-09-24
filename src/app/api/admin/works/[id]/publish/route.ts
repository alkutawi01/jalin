import { NextRequest, NextResponse } from "next/server";
import { publishWorkExplicit } from "../../../../../../lib/admin/publication-service";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { validateWorkForPublish } from "../../../../../../lib/admin/publish-validator";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Run publish validation
    const validation = await validateWorkForPublish(id);
    const failures = validation.filter(r => r.status === "FAIL");
    
    if (failures.length > 0) {
      return NextResponse.json({ 
        error: "Publish validation failed",
        failures: failures.map(f => ({ category: f.category, message: f.message }))
      }, { status: 422 });
    }
    
    const result = await publishWorkExplicit(id, {
      id: admin.id,
      email: admin.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status =
      message.includes("tidak ditemui") ? 404
      : message.includes("readiness") || message.includes("Status") ? 422
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
