import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../../lib/db";
import { applyManualUpload } from "../../../../../../lib/admin/visual-generation/manual-upload";

/**
 * POST /api/admin/visual-requests/[id]/upload  (multipart/form-data)
 *   file: image (PNG/JPEG/WebP, <= 10 MB)
 *   tool: optional name of the tool that made the image (recorded as provenance)
 *
 * Stores an editor-supplied image and moves the request to `under_review`.
 * It does NOT approve, attach or publish anything.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }
    if (!hasDb()) {
      return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });
    }

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fail imej diperlukan." }, { status: 400 });
    }
    const toolRaw = form.get("tool");
    const tool = typeof toolRaw === "string" && toolRaw.trim() ? toolRaw.trim().slice(0, 80) : null;

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await applyManualUpload(getDb(), numId, bytes, tool, admin.email || admin.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, assetPath: result.assetPath, backend: result.backend });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
