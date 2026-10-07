import { NextRequest, NextResponse } from "next/server";
import { getWork, updateWorkPlaces } from "../../../../../../lib/admin/work-service";

/** The places (Latar tempat) of a Work, kept in works.metadata.places next to the characters. */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const work = await getWork(id);
    if (!work) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    return NextResponse.json((work.metadata?.places as unknown[]) ?? []);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.places)) return NextResponse.json({ error: "places mesti senarai (array)." }, { status: 400 });
    const work = await updateWorkPlaces(id, body.places);
    return NextResponse.json((work.metadata?.places as unknown[]) ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: message === "Karya tidak ditemui." ? 404 : 400 });
  }
}
