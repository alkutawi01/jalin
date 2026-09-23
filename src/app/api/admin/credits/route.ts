import { NextRequest, NextResponse } from "next/server";
import { listCreditsForWork, createCredit, reorderCredits } from "../../../../lib/admin/credit-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workId = searchParams.get("workId");

    if (!workId) {
      return NextResponse.json({ error: "workId diperlukan." }, { status: 400 });
    }

    const credits = await listCreditsForWork(workId);
    return NextResponse.json(credits);
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

    // Validation
    if (!body.workId) {
      return NextResponse.json({ error: "workId diperlukan." }, { status: 400 });
    }
    if (!body.roleLabel?.trim()) {
      return NextResponse.json({ error: "roleLabel diperlukan." }, { status: 400 });
    }
    if (!body.contributorSlug && !body.guestName) {
      return NextResponse.json({ error: "contributor atau guestName diperlukan." }, { status: 400 });
    }

    const credit = await createCredit({
      workId: body.workId,
      contributorSlug: body.contributorSlug || undefined,
      guestName: body.guestName || undefined,
      roleLabel: body.roleLabel.trim(),
      byline: Boolean(body.byline),
      isPublic: body.isPublic !== false,
      sortOrder: body.sortOrder || 0,
    });

    return NextResponse.json(credit, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.workId || !body.creditIds) {
      return NextResponse.json({ error: "workId dan creditIds diperlukan." }, { status: 400 });
    }

    const credits = await reorderCredits(body.workId, body.creditIds);
    return NextResponse.json(credits);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
