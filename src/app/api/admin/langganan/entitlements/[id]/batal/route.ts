import { getDb } from "../../../../../../../lib/db";
import { logActivity } from "../../../../../../../lib/admin/activity";
import { actor, bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../../lib/admin/langganan-api";
import { revokeGrant } from "../../../../../../../lib/reader-auth/entitlements";

export const dynamic = "force-dynamic";

/** Cancel one period of access, with a reason. The periods after it are not moved: a gap is mended with a new grant. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Tempoh tidak sah.");
    const reason = str((await readBody(request)).reason, 300);
    if (!reason) return bad("Sebab diperlukan.");
    const who = await actor();
    const done = await revokeGrant(getDb(), id, who.name, reason);
    if (!done) return bad("Tempoh sudah dibatalkan atau tidak wujud.", 409);
    await logActivity({ action: "subscription.access.revoke", subjectType: "entitlement", subjectId: id, summary: reason });
    return json({ ok: true });
  });
}
