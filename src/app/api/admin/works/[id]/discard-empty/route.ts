import { NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";

/**
 * Old tabs may still send pagehide requests. Never delete a draft on their behalf:
 * an empty server row says nothing about text still held in a browser tab or local draft.
 */
export async function POST() {
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Sesi tamat." }, { status: 401 });
  return NextResponse.json({ discarded: false });
}
