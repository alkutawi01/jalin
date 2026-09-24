import { NextRequest, NextResponse } from "next/server";
import { reorderSeriesEntries } from "../../../../../../../lib/admin/series-service";
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

    if (!Array.isArray(body.workIds)) {
      return NextResponse.json({ error: "workIds diperlukan." }, { status: 400 });
    }
    if (body.confirm !== true && body.confirmPublished !== true) {
      // Allow reorder when no published episodes are affected; service returns flag.
      // Client should resend with confirm=true if reorderedPublished would be true.
    }

    const result = await reorderSeriesEntries(id, body.workIds.map(String));

    if (result.reorderedPublished && body.confirm !== true) {
      return NextResponse.json({
        requiresConfirmation: true,
        entries: result.entries,
        message:
          "Reorder melibatkan episod yang sudah terbit. Hantar semula dengan confirm=true untuk mengesahkan.",
      });
    }

    return NextResponse.json({
      requiresConfirmation: false,
      reorderedPublished: result.reorderedPublished,
      entries: result.entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status =
      message.includes("tidak sepadan") ||
      message.includes("berulang") ||
      message.includes("Jangkaan") ||
      message.includes("diperlukan")
        ? 400
        : message.includes("tidak ditemui")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
