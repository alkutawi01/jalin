import { NextRequest, NextResponse } from "next/server";
import { listSubmissions, createSubmission } from "../../../../lib/admin/submission-service";

export async function GET() {
  try {
    const submissions = await listSubmissions();
    return NextResponse.json(submissions);
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

    const submission = await createSubmission({
      proposedType: body.proposedType,
      proposedTitle: body.proposedTitle,
      proposedSlug: body.proposedSlug,
      manuscript: body.manuscript,
      dek: body.dek,
      status: body.status || "draft",
      submitterType: body.submitterType || "human",
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
