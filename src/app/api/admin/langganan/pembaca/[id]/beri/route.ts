import { getDb } from "../../../../../../../lib/db";
import { logActivity } from "../../../../../../../lib/admin/activity";
import { actor, bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../../lib/admin/langganan-api";
import { addGrant } from "../../../../../../../lib/reader-auth/entitlements";
import { isValidSharedGrant, type SharedGrant } from "../../../../../../../lib/subscription/shared-code";

export const dynamic = "force-dynamic";

/** Give a reader access (a gift, a make-good). It starts after the access they already have, and the reason is kept with it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Pembaca tidak sah.");
    const body = await readBody(request);
    const grant = { unit: str(body.unit, 10), amount: Number(body.amount) } as SharedGrant;
    if (!isValidSharedGrant(grant)) return bad("Pilih tempoh: 7 atau 14 hari, atau 1, 6 atau 12 bulan.");
    const reason = str(body.reason, 300);
    if (!reason) return bad("Sebab diperlukan.");
    const who = await actor();
    const result = await addGrant(getDb(), { accountId: id, kind: "ADMIN", grant, reason, createdBy: who.name });
    if (!result.added) return bad("Pembaca tidak dijumpai.", 404);
    await logActivity({ action: "subscription.access.grant", subjectType: "reader", subjectId: id, summary: `${grant.amount} ${grant.unit === "days" ? "hari" : "bulan"}: ${reason}` });
    return json({ ok: true, startsAt: result.startsAt, endsAt: result.endsAt });
  });
}
