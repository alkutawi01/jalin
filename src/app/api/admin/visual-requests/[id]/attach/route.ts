import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../../lib/db";
import { attachVisualToWork } from "../../../../../../lib/admin/visual-generation";

/**
 * POST /api/admin/visual-requests/[id]/attach
 *
 * Attach an approved visual to a canonical Work.
 * Only approved visuals may be attached.
 * Does NOT publish the Work.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const db = getDb();
    const result = await attachVisualToWork(db, numId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      visualId: result.visualId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
