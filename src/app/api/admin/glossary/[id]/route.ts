import { NextRequest, NextResponse } from "next/server";
import { capitaliseFirst } from "../../../../../lib/capitalise-first";
import { getGlossaryTerm, updateGlossaryTerm, deleteGlossaryTerm, listGlossaryForWork } from "../../../../../lib/admin/glossary-service";
import { findDuplicateTerm } from "../../../../../lib/admin/metadata-rules";
import { parseDbId } from "../../../../../lib/admin/ids";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const termId = parseDbId(id);

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
    const termId = parseDbId(id);

    if (isNaN(termId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    // Check if term exists
    const existing = await getGlossaryTerm(termId);
    if (!existing) {
      return NextResponse.json({ error: "Glossary tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    // A term and its meaning are never blank: a blank one would show as an empty glossary entry to readers.
    for (const [field, label] of [["term", "Istilah"], ["meaning", "Maksud"]] as const) {
      if (body[field] !== undefined && (typeof body[field] !== "string" || !body[field].trim())) {
        return NextResponse.json({ error: `${label} tidak boleh kosong.` }, { status: 400 });
      }
    }
    if (typeof body.term === "string") body.term = body.term.trim();
    if (typeof body.meaning === "string") body.meaning = capitaliseFirst(body.meaning.trim());

    if (typeof body.term === "string" && body.term.trim()) {
      const duplicate = findDuplicateTerm(await listGlossaryForWork(existing.work_id), body.term, termId);
      if (duplicate) {
        return NextResponse.json({ error: `Istilah "${duplicate.term}" sudah ada dalam glosari karya ini.` }, { status: 409 });
      }
    }

    const term = await updateGlossaryTerm(termId, {
      term: body.term,
      meaning: body.meaning,
      source: body.source,
      sortOrder: body.sortOrder,
      pronunciation: typeof body.pronunciation === "string" ? body.pronunciation : undefined,
      originalText: typeof body.originalText === "string" ? body.originalText : undefined,
      originalLanguage: typeof body.originalLanguage === "string" ? body.originalLanguage : undefined,
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
    const termId = parseDbId(id);

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
