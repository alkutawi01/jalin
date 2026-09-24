import { NextRequest, NextResponse } from "next/server";
import { reorderSections } from "../../../../../../../lib/admin/section-service";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";

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
    const body = await request.json();

    if (!Array.isArray(body.sectionIds)) {
      return NextResponse.json({ error: "sectionIds diperlukan." }, { status: 400 });
    }

    const sections = await reorderSections(id, body.sectionIds.map(Number));
    return NextResponse.json(sections);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status =
      message.includes("tidak sepadan") ||
      message.includes("berulang") ||
      message.includes("Jangkaan") ||
      message.includes("tidak sah")
        ? 400
        : message.includes("tidak ditemui")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
