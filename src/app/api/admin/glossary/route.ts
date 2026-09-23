import { NextRequest, NextResponse } from "next/server";
import { listGlossaryForWork, createGlossaryTerm } from "../../../../lib/admin/glossary-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workId = searchParams.get("workId");

    if (!workId) {
      return NextResponse.json({ error: "workId diperlukan." }, { status: 400 });
    }

    const terms = await listGlossaryForWork(workId);
    return NextResponse.json(terms);
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
    if (!body.term?.trim()) {
      return NextResponse.json({ error: "term diperlukan." }, { status: 400 });
    }
    if (!body.meaning?.trim()) {
      return NextResponse.json({ error: "meaning diperlukan." }, { status: 400 });
    }

    const term = await createGlossaryTerm({
      workId: body.workId,
      term: body.term.trim(),
      meaning: body.meaning.trim(),
      source: body.source || "",
      sortOrder: body.sortOrder || 0,
    });

    return NextResponse.json(term, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
