import { NextRequest, NextResponse } from "next/server";
import { getWork, updateWorkTimes } from "../../../../../../lib/admin/work-service";

/** The times (Latar masa: a year, a period or an era) of a Work, kept in works.metadata.times next to the places and characters. */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const work = await getWork(id);
    if (!work) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
    return NextResponse.json((work.metadata?.times as unknown[]) ?? []);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.times)) return NextResponse.json({ error: "times mesti senarai (array)." }, { status: 400 });
    const work = await updateWorkTimes(id, body.times);
    return NextResponse.json((work.metadata?.times as unknown[]) ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: message === "Work not found." ? 404 : 400 });
  }
}
