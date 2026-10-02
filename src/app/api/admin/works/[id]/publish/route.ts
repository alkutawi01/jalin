import { NextRequest, NextResponse } from "next/server";
import { publishWorkExplicit, republishWork } from "../../../../../../lib/admin/publication-service";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.republish) {
      const result = await republishWork(id, { id: admin.id, email: admin.email }, {
        summary: typeof body.summary === "string" ? body.summary : undefined,
        changeType: ["major", "minor", "patch"].includes(body.changeType) ? body.changeType : undefined,
      });
      return NextResponse.json(result);
    }

    // The publication service owns the authoritative readiness check, including
    // a fresh recheck in the same transaction as the status update.
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
