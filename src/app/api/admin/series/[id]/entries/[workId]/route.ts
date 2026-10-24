import { NextRequest, NextResponse } from "next/server";
import { detachEpisode } from "../../../../../../../lib/admin/series-service";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";
import { publicErrorMessage } from "../../../../../../../lib/admin/api-errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }

    const { id, workId } = await params;
    await detachEpisode(id, workId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = publicErrorMessage(error, "Ralat tidak diketahui.");
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("sudah terbit") || message.includes("tidak boleh")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
