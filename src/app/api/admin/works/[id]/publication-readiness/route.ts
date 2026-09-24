import { NextRequest, NextResponse } from "next/server";
import { evaluatePublicationReadiness } from "../../../../../../lib/admin/publication-service";

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
    return NextResponse.json(readiness);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
