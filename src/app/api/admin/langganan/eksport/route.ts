import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { guarded } from "../../../../../lib/admin/langganan-api";
import { freshExport } from "../../../../../lib/reader-auth/maintenance";

export const dynamic = "force-dynamic";

/** A fresh signed file of all codes and redemptions, for the owner to keep on their own computer. It holds no plain code and no e-mail address. */
export async function GET() {
  return guarded(async () => {
    const text = await freshExport(getDb());
    await logActivity({ action: "subscription.switch", subjectType: "export", subjectId: "codes", summary: "Fail eksport kod dimuat turun" });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(text, { status: 200, headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Content-Disposition": `attachment; filename="jalin-kod-${stamp}.ndjson"`, "Cache-Control": "no-store" } });
  });
}
