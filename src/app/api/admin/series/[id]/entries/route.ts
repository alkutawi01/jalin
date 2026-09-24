import { NextRequest, NextResponse } from "next/server";
import { attachEpisode, listSeriesEntries } from "../../../../../../lib/admin/series-service";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = await listSeriesEntries(id);
    return NextResponse.json(entries);
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

    if (!body.workId) {
      return NextResponse.json({ error: "workId diperlukan." }, { status: 400 });
    }

    const entry = await attachEpisode(
      id,
      body.workId,
      body.position !== undefined ? Number(body.position) : undefined
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("sudah menjadi") || message.includes("duplicate")
        ? 409
        : message.includes("hanya") || message.includes("tidak sah") || message.includes("sudah digunakan") || message.includes("diperlukan")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
