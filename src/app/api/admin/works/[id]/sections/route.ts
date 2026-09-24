import { NextRequest, NextResponse } from "next/server";
import {
  listSectionsForWork,
  createSection,
} from "../../../../../../lib/admin/section-service";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workId = searchParams.get("workId") || id;
    const sections = await listSectionsForWork(workId);
    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.slug?.trim()) {
      return NextResponse.json({ error: "slug diperlukan." }, { status: 400 });
    }
    if (!body.body?.trim()) {
      return NextResponse.json({ error: "body diperlukan." }, { status: 400 });
    }

    const section = await createSection({
      workId: id,
      slug: body.slug.trim(),
      title: body.title ?? null,
      position: body.position !== undefined ? Number(body.position) : undefined,
      body: body.body,
      readingMinutes: body.readingMinutes ?? null,
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("tidak sah") || message.includes("diperlukan") || message.includes("sudah digunakan") || message.includes("hanya untuk")
        ? 400
        : message.includes("duplicate") || message.includes("berulang")
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
