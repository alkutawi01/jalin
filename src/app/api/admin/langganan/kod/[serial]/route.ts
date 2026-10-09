import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../lib/admin/langganan-api";
import { findCodeBySerial } from "../../../../../../lib/reader-auth/admin";
import { revokeCode } from "../../../../../../lib/reader-auth/redeem";

export const dynamic = "force-dynamic";

/** One card, found by the serial number printed outside the scratch area. */
export async function GET(_request: Request, { params }: { params: Promise<{ serial: string }> }) {
  return guarded(async () => {
    const { serial } = await params;
    const info = await findCodeBySerial(getDb(), decodeURIComponent(serial));
    return info ? json({ code: info }) : bad("Nombor siri tidak dijumpai.", 404);
  });
}

/** Cancel one card (lost, stolen, damaged). Access it already gave stays until it is cancelled on the reader's page. */
export async function POST(request: Request, { params }: { params: Promise<{ serial: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { serial } = await params;
    const body = await readBody(request);
    const reason = str(body.reason, 300);
    if (str(body.action, 20) !== "revoke") return bad("Tindakan tidak dikenali.");
    if (!reason) return bad("Sebab diperlukan.");
    const clean = decodeURIComponent(serial).trim().toUpperCase();
    const done = await revokeCode(getDb(), clean, reason);
    if (!done) return bad("Kod sudah dibatalkan atau nombor siri tidak wujud.", 409);
    await logActivity({ action: "subscription.code.revoke", subjectType: "code", subjectId: clean, summary: `${clean}: ${reason}` });
    return json({ ok: true });
  });
}
