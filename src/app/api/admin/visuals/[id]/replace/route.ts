import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../../../lib/db";
import { replaceVisualImage } from "../../../../../../lib/admin/visual-generation/work-visual-upload";

/**
 * POST /api/admin/visuals/[id]/replace  (multipart/form-data)
 *   file (image), optional alt, tool.
 * Replaces the image of an attached visual, keeping its role, position and alt text.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    if (!hasDb()) return NextResponse.json({ error: "Pangkalan data tidak tersedia." }, { status: 503 });

    const { id } = await params;
    const visualId = parseInt(id, 10);
    if (Number.isNaN(visualId)) return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fail imej diperlukan." }, { status: 400 });
    const text = (key: string): string => {
      const value = form.get(key);
      return typeof value === "string" ? value.trim() : "";
    };

    const result = await replaceVisualImage(getDb(), {
      visualId,
      bytes: Buffer.from(await file.arrayBuffer()),
      toolName: text("tool").slice(0, 80) || null,
      altText: text("alt") || undefined,
      actor: admin.email || admin.id
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, visualId: result.visualId, assetPath: result.assetPath });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
