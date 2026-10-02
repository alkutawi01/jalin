import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { getPickState, savePicks } from "../../../../lib/admin/editor-picks-service";

export async function GET() {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  }
  try {
    return NextResponse.json(await getPickState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}

/** Replace the set of homepage picks: { picks: [{ id, reason }] } in display order. */
export async function PUT(request: NextRequest) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body?.picks)) {
      return NextResponse.json({ error: "Senarai pilihan tidak sah." }, { status: 400 });
    }
    const picks = body.picks.map((p: { id?: unknown; reason?: unknown }) => ({ id: String(p?.id ?? ""), reason: typeof p?.reason === "string" ? p.reason : "" }));
    await savePicks(picks);
    return NextResponse.json(await getPickState());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = /maksimum|sama|hanya karya|tidak sah/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
