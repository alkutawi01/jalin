import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../lib/admin/langganan-api";
import { confirmBatchPrinted, issueCodes, voidBatch } from "../../../../../../lib/reader-auth/redeem";

export const dynamic = "force-dynamic";

/** Steps of a batch: confirm that the print came out right, issue its codes (all, or only the serial numbers named), or cancel it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Kelompok tidak sah.");
    const body = await readBody(request, 200_000);
    const db = getDb();
    const action = str(body.action, 20);

    if (action === "confirm") {
      const done = await confirmBatchPrinted(db, id);
      if (!done) return bad("Cetakan kelompok ini sudah disahkan atau kelompok tidak wujud.", 409);
      await logActivity({ action: "subscription.batch.update", subjectType: "batch", subjectId: id, summary: "Cetakan disahkan" });
      return json({ ok: true });
    }
    if (action === "issue") {
      const serials = Array.isArray(body.serials) ? body.serials.map((s) => str(s, 30).toUpperCase()).filter(Boolean).slice(0, 5000) : null;
      const count = await issueCodes(db, serials ? { serials } : { batchId: id });
      if (count === 0) return bad("Tiada kod yang boleh diaktifkan. Sahkan cetakan dahulu, atau kod sudah diaktifkan.", 409);
      await logActivity({ action: "subscription.batch.update", subjectType: "batch", subjectId: id, summary: serials ? `${count} kod diaktifkan mengikut nombor siri` : `${count} kod diaktifkan` });
      return json({ ok: true, issued: count });
    }
    if (action === "void") {
      const reason = str(body.reason, 300);
      if (!reason) return bad("Sebab diperlukan.");
      const done = await voidBatch(db, id, reason);
      if (!done) return bad("Kelompok sudah dibatalkan atau tidak wujud.", 409);
      await logActivity({ action: "subscription.batch.update", subjectType: "batch", subjectId: id, summary: `Kelompok dibatalkan: ${reason}` });
      return json({ ok: true });
    }
    return bad("Tindakan tidak dikenali.");
  });
}
