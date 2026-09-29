import { NextRequest, NextResponse } from "next/server";
import { getWork, updateWorkCharacters } from "../../../../../../lib/admin/work-service";

/**
 * Character metadata for a Work — see work-service.ts for the field
 * contract and docs/JALIN_CONTENT_MODEL_READINESS_AUDIT.md for why
 * this reuses the existing works.metadata jsonb column rather than a
 * new table.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const work = await getWork(id);

    if (!work) {
      return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    }

    const characters = (work.metadata?.characters as unknown[]) ?? [];
    return NextResponse.json(characters);
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
    const body = await request.json();

    if (!Array.isArray(body.characters)) {
      return NextResponse.json({ error: "characters mesti senarai (array)." }, { status: 400 });
    }

    const work = await updateWorkCharacters(id, body.characters);
    return NextResponse.json((work.metadata?.characters as unknown[]) ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message === "Work not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
