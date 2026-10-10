import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { bad, guarded, json } from "../../../../../../lib/admin/langganan-api";
import { readerDetail } from "../../../../../../lib/reader-auth/admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Pembaca tidak sah.");
    const detail = await readerDetail(getDb(), id);
    if (!detail) return bad("Pembaca tidak dijumpai.", 404);
    await logActivity({ action: "subscription.reader.view", subjectType: "reader", subjectId: id, summary: "Rekod pembaca dibuka" });
    return json({ reader: detail });
  });
}
