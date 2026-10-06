import { NextRequest, NextResponse } from "next/server";
import { capitaliseFirst } from "../../../../lib/capitalise-first";
import { listGlossaryForWork, createGlossaryTerm } from "../../../../lib/admin/glossary-service";
import { findDuplicateTerm } from "../../../../lib/admin/metadata-rules";

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
    if (typeof body.term !== "string" || !body.term.trim()) {
      return NextResponse.json({ error: "term diperlukan." }, { status: 400 });
    }
    if (typeof body.meaning !== "string" || !body.meaning.trim()) {
      return NextResponse.json({ error: "meaning diperlukan." }, { status: 400 });
    }

    const duplicate = findDuplicateTerm(await listGlossaryForWork(body.workId), body.term);
    if (duplicate) {
      return NextResponse.json({ error: `Istilah "${duplicate.term}" sudah ada dalam glosari karya ini. Ubah yang sedia ada.` }, { status: 409 });
    }

    const term = await createGlossaryTerm({
      workId: body.workId,
      term: body.term.trim(),
      meaning: capitaliseFirst(body.meaning.trim()),
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
