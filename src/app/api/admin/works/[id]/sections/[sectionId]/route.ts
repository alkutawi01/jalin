import { NextRequest, NextResponse } from "next/server";
import {
  getSection,
  updateSection,
  deleteSection,
} from "../../../../../../../lib/admin/section-service";
import { getCurrentAdmin } from "../../../../../../../lib/admin/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const section = await getSection(parseInt(sectionId, 10));
    if (!section) {
      return NextResponse.json({ error: "Bahagian tidak ditemui." }, { status: 404 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;
    const id = parseInt(sectionId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getSection(id);
    if (!existing) {
      return NextResponse.json({ error: "Bahagian tidak ditemui." }, { status: 404 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;
    const id = parseInt(sectionId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getSection(id);
    if (!existing) {
      return NextResponse.json({ error: "Bahagian tidak ditemui." }, { status: 404 });
    }

    await deleteSection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
