import { NextRequest, NextResponse } from "next/server";
import { getSubmission, updateSubmission, deleteSubmission } from "../../../../../lib/admin/submission-service";

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

    const submission = await getSubmission(numId);

    if (!submission) {
      return NextResponse.json({ error: "Submission tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(submission);
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

    const existing = await getSubmission(numId);
    if (!existing) {
      return NextResponse.json({ error: "Submission tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    const submission = await updateSubmission(numId, {
      proposedType: body.proposedType,
      proposedTitle: body.proposedTitle,
      proposedSlug: body.proposedSlug,
      manuscript: body.manuscript,
      dek: body.dek,
      status: body.status,
      reviewerNotes: body.reviewerNotes,
      resultWorkId: body.resultWorkId,
    });

    return NextResponse.json(submission);
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

    const existing = await getSubmission(numId);
    if (!existing) {
      return NextResponse.json({ error: "Submission tidak ditemui." }, { status: 404 });
    }

    await deleteSubmission(numId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
