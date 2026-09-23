import { NextRequest, NextResponse } from "next/server";
import { getVisualRequest, updateVisualRequest, deleteVisualRequest } from "../../../../../lib/admin/visual-request-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const visualRequest = await getVisualRequest(numId);

    if (!visualRequest) {
      return NextResponse.json({ error: "Visual request tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(visualRequest);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getVisualRequest(numId);
    if (!existing) {
      return NextResponse.json({ error: "Visual request tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    const visualRequest = await updateVisualRequest(numId, {
      workId: body.workId,
      submissionId: body.submissionId,
      visualRole: body.visualRole,
      prompt: body.prompt,
      provider: body.provider,
      providerRequestId: body.providerRequestId,
      providerCreationId: body.providerCreationId,
      status: body.status,
      sourceAssetUrl: body.sourceAssetUrl,
      sourceAssetPath: body.sourceAssetPath,
      altText: body.altText,
      anchor: body.anchor,
      place: body.place,
      approvalState: body.approvalState,
      aspectRatio: body.aspectRatio,
      model: body.model,
      executionMode: body.executionMode,
    });

    return NextResponse.json(visualRequest);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getVisualRequest(numId);
    if (!existing) {
      return NextResponse.json({ error: "Visual request tidak ditemui." }, { status: 404 });
    }

    await deleteVisualRequest(numId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
