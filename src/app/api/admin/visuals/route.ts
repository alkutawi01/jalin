import { NextRequest, NextResponse } from "next/server";
import { listVisualsForWork, createVisual, reorderVisuals } from "../../../../lib/admin/visual-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workId = searchParams.get("workId");

    if (!workId) {
      return NextResponse.json({ error: "workId diperlukan." }, { status: 400 });
    }

    const visuals = await listVisualsForWork(workId);
    return NextResponse.json(visuals);
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
    if (!body.src?.trim()) {
      return NextResponse.json({ error: "src diperlukan." }, { status: 400 });
    }
    if (!body.role) {
      return NextResponse.json({ error: "role diperlukan." }, { status: 400 });
    }

    const validRoles = ["hero", "inline", "section"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "role tidak sah." }, { status: 400 });
    }

    const visual = await createVisual({
      workId: body.workId,
      role: body.role,
      src: body.src.trim(),
      alt: body.alt || undefined,
      provider: body.provider || undefined,
      creationId: body.creationId || undefined,
      anchor: body.anchor || undefined,
      place: body.place || "after",
      sortOrder: body.sortOrder || 0,
    });

    return NextResponse.json(visual, { status: 201 });
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

    if (!body.workId || !body.visualIds) {
      return NextResponse.json({ error: "workId dan visualIds diperlukan." }, { status: 400 });
    }

    const visuals = await reorderVisuals(body.workId, body.visualIds);
    return NextResponse.json(visuals);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
