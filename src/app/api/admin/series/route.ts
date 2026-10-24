import { NextRequest, NextResponse } from "next/server";
import { listSeries, createSeries } from "../../../../lib/admin/series-service";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { publicErrorMessage } from "../../../../lib/admin/api-errors";

export async function GET() {
  try {
    const series = await listSeries();
    return NextResponse.json(series);
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Ralat tidak diketahui.") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }

    const body = await request.json();
    if (!body.slug?.trim() || !body.title?.trim()) {
      return NextResponse.json({ error: "Alamat pautan dan tajuk diperlukan." }, { status: 400 });
    }

    const series = await createSeries({
      slug: body.slug.trim(),
      title: body.title.trim(),
      dek: body.dek ?? null,
      genre: body.genre ?? null,
      audience: body.audience ?? null,
      mode: body.mode || "continuous",
      status: body.status || "ongoing",
    });

    return NextResponse.json(series, { status: 201 });
  } catch (error) {
    const message = publicErrorMessage(error, "Ralat tidak diketahui.");
    const status = message.includes("sudah wujud")
      ? 409
      : message.includes("tidak sah") || message.includes("diperlukan")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
