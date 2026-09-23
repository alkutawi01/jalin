import { NextRequest, NextResponse } from "next/server";
import { listVisualRequests, createVisualRequest } from "../../../../lib/admin/visual-request-service";

export async function GET() {
  try {
    const requests = await listVisualRequests();
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "prompt diperlukan." }, { status: 400 });
    }
    if (!body.visualRole?.trim()) {
      return NextResponse.json({ error: "visualRole diperlukan." }, { status: 400 });
    }

    const visualRequest = await createVisualRequest({
      workId: body.workId,
      submissionId: body.submissionId,
      visualRole: body.visualRole,
      prompt: body.prompt.trim(),
      provider: body.provider || "magnific",
      status: body.status,
      sourceAssetUrl: body.sourceAssetUrl,
      sourceAssetPath: body.sourceAssetPath,
      altText: body.altText,
      anchor: body.anchor,
      place: body.place,
      approvalState: body.approvalState,
    });

    return NextResponse.json(visualRequest, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
