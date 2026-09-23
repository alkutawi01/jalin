import { NextRequest, NextResponse } from "next/server";
import { getGlossaryTerm, updateGlossaryTerm, deleteGlossaryTerm } from "../../../../../lib/admin/glossary-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const termId = parseInt(id, 10);

    if (isNaN(termId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const term = await getGlossaryTerm(termId);

    if (!term) {
      return NextResponse.json({ error: "Glossary tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(term);
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
    const termId = parseInt(id, 10);

    if (isNaN(termId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if term exists
    const existing = await getGlossaryTerm(termId);
    if (!existing) {
      return NextResponse.json({ error: "Glossary tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    const term = await updateGlossaryTerm(termId, {
      term: body.term,
      meaning: body.meaning,
      source: body.source,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json(term);
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
    const termId = parseInt(id, 10);

    if (isNaN(termId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if term exists
    const existing = await getGlossaryTerm(termId);
    if (!existing) {
      return NextResponse.json({ error: "Glossary tidak ditemui." }, { status: 404 });
    }

    await deleteGlossaryTerm(termId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
