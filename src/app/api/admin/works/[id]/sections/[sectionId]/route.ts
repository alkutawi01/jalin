import { NextRequest, NextResponse } from "next/server";
import {
  getSection,
  updateSection,
  deleteSection,
} from "../../../../../../../lib/admin/section-service";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";
import { parseDbId } from "../../../../../../../lib/admin/ids";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { id: workId, sectionId } = await params;
    const sectionKey = parseDbId(sectionId);
    if (Number.isNaN(sectionKey)) {
      return NextResponse.json({ error: "ID bab tidak sah." }, { status: 400 });
    }
    const section = await getSection(sectionKey);
    // A chapter is only reachable through the work it belongs to.
    if (!section || section.work_id !== workId) {
      return NextResponse.json({ error: "Bab tidak ditemui." }, { status: 404 });
    }
    return NextResponse.json(section);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }

    const { id: workId, sectionId } = await params;
    const id = parseDbId(sectionId);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID bab tidak sah." }, { status: 400 });
    }
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getSection(id);
    // A chapter is only reachable through the work it belongs to (a wrong pair of IDs must not touch another work).
    if (!existing || existing.work_id !== workId) {
      return NextResponse.json({ error: "Bab tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();
    const section = await updateSection(id, {
      slug: body.slug,
      title: body.title,
      body: body.body,
      position: body.position !== undefined ? Number(body.position) : undefined,
      readingMinutes: body.readingMinutes,
    });

    return NextResponse.json(section);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("tidak sah") || message.includes("kosong")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }

    const { id: workId, sectionId } = await params;
    const id = parseDbId(sectionId);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID bab tidak sah." }, { status: 400 });
    }
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getSection(id);
    // A chapter is only reachable through the work it belongs to (a wrong pair of IDs must not touch another work).
    if (!existing || existing.work_id !== workId) {
      return NextResponse.json({ error: "Bab tidak ditemui." }, { status: 404 });
    }

    await deleteSection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
