import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../../../lib/db";
import { uploadVisualForWork } from "../../../../../../../lib/admin/visual-generation/work-visual-upload";

/**
 * POST /api/admin/works/[id]/visuals/upload  (multipart/form-data)
 *   file, role (hero|inline|section), alt, and optionally
 *   anchor, place (before|after), tool.
 *
 * One step: store the editor's image, record the approval and attach it to
 * the work. Never publishes the work.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasDb()) return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });

    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fail imej diperlukan." }, { status: 400 });
    }

    const text = (key: string): string => {
      const value = form.get(key);
      return typeof value === "string" ? value.trim() : "";
    };

    const result = await uploadVisualForWork(getDb(), {
      workId: id,
      role: text("role") || "inline",
      altText: text("alt"),
      anchor: text("anchor") || null,
      place: text("place") === "before" ? "before" : "after",
      toolName: text("tool").slice(0, 80) || null,
      bytes: Buffer.from(await file.arrayBuffer()),
      actor: admin.email || admin.id
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, visualRequestId: result.visualRequestId },
        { status: result.status }
      );
    }
    return NextResponse.json(
      { success: true, visualId: result.visualId, visualRequestId: result.visualRequestId, assetPath: result.assetPath },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
