import { NextResponse } from "next/server";
import { getDb } from "../../../../../../../lib/db";
import { bad, guarded } from "../../../../../../../lib/admin/langganan-api";
import { buildPrompt } from "../../../../../../../lib/panel/prompt";

export const dynamic = "force-dynamic";

/** The instruction for one snapshot as plain text (the same text the page offers to copy). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return bad("Snapshot tidak sah.");
    const snap = await getDb().selectFrom("panel_snapshots").selectAll().where("id", "=", id).executeTakeFirst();
    if (!snap) return bad("Snapshot tidak ditemui.", 404);
    const coverage = String((snap.manifest as Record<string, unknown>).coverage ?? "");
    const text = buildPrompt({ code: snap.ref_code, title: snap.title, workType: snap.work_type, coverage, text: snap.text_body });
    return new NextResponse(text, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  });
}
