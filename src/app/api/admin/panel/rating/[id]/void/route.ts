import { notReady } from "@/lib/panel/ready";
import { getDb } from "../../../../../../../lib/db";
import { logActivity } from "../../../../../../../lib/admin/activity";
import { actor, bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../../lib/admin/langganan-api";
import { voidRating } from "../../../../../../../lib/panel/service";

export const dynamic = "force-dynamic";

/** Take a rating out of the mean. It is never deleted or edited: the reason and the person are kept on it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const blocked = await notReady();
    if (blocked) return blocked;
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return bad("Penilaian tidak sah.");
    const reason = str((await readBody(request)).reason, 500);
    if (!reason) return bad("Sebab pembatalan diperlukan.");
    const who = await actor();
    const done = await voidRating(getDb(), id, reason, who.name);
    if (!done) return bad("Penilaian tidak ditemui atau sudah dibatalkan.", 404);
    await logActivity({ action: "panel.void", subjectType: "panel_rating", subjectId: id, summary: reason });
    return json({ ok: true });
  });
}
