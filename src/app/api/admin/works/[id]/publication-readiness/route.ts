import { NextRequest, NextResponse } from "next/server";
import { evaluatePublicationReadiness } from "../../../../../../lib/admin/publication-service";
import { getWork } from "../../../../../../lib/admin/work-service";
import { getUnpublishedChanges } from "../../../../../../lib/admin/revision-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const readiness = await evaluatePublicationReadiness(id);
    if (!readiness) {
      return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    }
    // For a published work, also say whether the draft differs from what readers see.
    const work = await getWork(id);
    const unpublished = work?.status === "published" ? await getUnpublishedChanges(id) : null;
    return NextResponse.json({ ...readiness, unpublished });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
