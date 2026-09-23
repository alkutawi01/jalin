import { NextRequest, NextResponse } from "next/server";
import { getCredit, updateCredit, deleteCredit } from "../../../../../lib/admin/credit-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditId = parseInt(id, 10);

    if (isNaN(creditId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const credit = await getCredit(creditId);

    if (!credit) {
      return NextResponse.json({ error: "Kredit tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(credit);
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
    const creditId = parseInt(id, 10);

    if (isNaN(creditId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if credit exists
    const existing = await getCredit(creditId);
    if (!existing) {
      return NextResponse.json({ error: "Kredit tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    const credit = await updateCredit(creditId, {
      contributorSlug: body.contributorSlug,
      guestName: body.guestName,
      roleLabel: body.roleLabel,
      byline: body.byline,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json(credit);
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
    const creditId = parseInt(id, 10);

    if (isNaN(creditId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if credit exists
    const existing = await getCredit(creditId);
    if (!existing) {
      return NextResponse.json({ error: "Kredit tidak ditemui." }, { status: 404 });
    }

    await deleteCredit(creditId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
