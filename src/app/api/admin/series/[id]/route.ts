import { NextRequest, NextResponse } from "next/server";
import { getSeries, updateSeries, deleteSeries, listSeriesEntries } from "../../../../../lib/admin/series-service";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const series = await getSeries(id);
    if (!series) {
      return NextResponse.json({ error: "Siri tidak ditemui." }, { status: 404 });
    }
    const entries = await listSeriesEntries(id);
    return NextResponse.json({ ...series, entries });
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
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getSeries(id);
    if (!existing) {
      return NextResponse.json({ error: "Siri tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();
    const series = await updateSeries(id, {
      slug: body.slug,
      title: body.title,
      dek: body.dek,
      genre: body.genre,
      audience: body.audience,
      mode: body.mode,
      status: body.status,
    });

    return NextResponse.json(series);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("sudah wujud")
        ? 409
        : message.includes("tidak sah")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getSeries(id);
    if (!existing) {
      return NextResponse.json({ error: "Siri tidak ditemui." }, { status: 404 });
    }

    await deleteSeries(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("tidak ditemui")
      ? 404
      : message.includes("masih mempunyai")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
