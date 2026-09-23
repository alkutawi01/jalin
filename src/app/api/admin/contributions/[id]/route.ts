import { NextRequest, NextResponse } from "next/server";
import { getContribution, updateContribution, deleteContribution } from "../../../../../lib/admin/contribution-service";

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

    const contribution = await getContribution(numId);

    if (!contribution) {
      return NextResponse.json({ error: "Sumbangan tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(contribution);
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

    const existing = await getContribution(numId);
    if (!existing) {
      return NextResponse.json({ error: "Sumbangan tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    const contribution = await updateContribution(numId, {
      contributorSlug: body.contributorSlug,
      guestName: body.guestName,
      roleKey: body.roleKey,
      roleLabel: body.roleLabel,
      sortOrder: body.sortOrder,
      suggestedPublicCredit: body.suggestedPublicCredit,
      aiProvider: body.aiProvider,
      aiModel: body.aiModel,
      aiPersona: body.aiPersona,
      aiActualRole: body.aiActualRole,
      aiIdentitySource: body.aiIdentitySource,
    });

    return NextResponse.json(contribution);
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

    const existing = await getContribution(numId);
    if (!existing) {
      return NextResponse.json({ error: "Sumbangan tidak ditemui." }, { status: 404 });
    }

    await deleteContribution(numId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
