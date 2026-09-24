import { NextRequest, NextResponse } from "next/server";
import { detachEpisode } from "../../../../../../../lib/admin/series-service";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, workId } = await params;
    await detachEpisode(id, workId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("sudah terbit") || message.includes("tidak boleh")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
