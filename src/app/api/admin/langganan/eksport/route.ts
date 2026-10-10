import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { guarded } from "../../../../../lib/admin/langganan-api";
import { freshExport } from "../../../../../lib/reader-auth/maintenance";

export const dynamic = "force-dynamic";

/** A fresh encrypted, signed backup for the owner; its inner NDJSON contains plaintext shared codes. */
export async function GET() {
  return guarded(async () => {
    const ciphertext = await freshExport(getDb());
    await logActivity({ action: "subscription.switch", subjectType: "export", subjectId: "codes", summary: "Fail eksport kod dimuat turun" });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(ciphertext, { status: 200, headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="jalin-kod-${stamp}.enc"`, "Cache-Control": "no-store" } });
  });
}
