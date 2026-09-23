import { NextRequest, NextResponse } from "next/server";
import { listContributionsForSubmission, createContribution } from "../../../../../../lib/admin/contribution-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId diperlukan." }, { status: 400 });
    }

    const numId = parseInt(submissionId, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "submissionId tidak sah." }, { status: 400 });
    }

    const contributions = await listContributionsForSubmission(numId);
    return NextResponse.json(contributions);
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

    if (!body.submissionId) {
      return NextResponse.json({ error: "submissionId diperlukan." }, { status: 400 });
    }
    if (!body.roleLabel?.trim()) {
      return NextResponse.json({ error: "roleLabel diperlukan." }, { status: 400 });
    }

    const contribution = await createContribution({
      submissionId: body.submissionId,
      contributorSlug: body.contributorSlug,
      guestName: body.guestName,
      roleKey: body.roleKey,
      roleLabel: body.roleLabel.trim(),
      sortOrder: body.sortOrder || 0,
      suggestedPublicCredit: body.suggestedPublicCredit,
      aiProvider: body.aiProvider,
      aiModel: body.aiModel,
      aiPersona: body.aiPersona,
      aiActualRole: body.aiActualRole,
      aiIdentitySource: body.aiIdentitySource,
    });

    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
