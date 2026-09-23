import { NextRequest, NextResponse } from "next/server";
import { getVisual, updateVisual, deleteVisual } from "../../../../../lib/admin/visual-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visualId = parseInt(id, 10);

    if (isNaN(visualId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const visual = await getVisual(visualId);

    if (!visual) {
      return NextResponse.json({ error: "Visual tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(visual);
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
    const visualId = parseInt(id, 10);

    if (isNaN(visualId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if visual exists
    const existing = await getVisual(visualId);
    if (!existing) {
      return NextResponse.json({ error: "Visual tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    // Validate role if provided
    if (body.role) {
      const validRoles = ["hero", "inline", "section"];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: "role tidak sah." }, { status: 400 });
      }
    }

    const visual = await updateVisual(visualId, {
      role: body.role,
      src: body.src,
      alt: body.alt,
      provider: body.provider,
      creationId: body.creationId,
      anchor: body.anchor,
      place: body.place,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json(visual);
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
    const visualId = parseInt(id, 10);

    if (isNaN(visualId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if visual exists
    const existing = await getVisual(visualId);
    if (!existing) {
      return NextResponse.json({ error: "Visual tidak ditemui." }, { status: 404 });
    }

    await deleteVisual(visualId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
