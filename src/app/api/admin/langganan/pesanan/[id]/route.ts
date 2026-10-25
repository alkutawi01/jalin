import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { bad, guarded, json, readBody, sameOriginOrRefuse } from "../../../../../../lib/admin/langganan-api";
import { codeKey, mailer } from "../../../../../../lib/reader-auth/http";
import { deliverOrder } from "../../../../../../lib/reader-auth/orders";
import { SITE_URL } from "../../../../../../lib/seo";

export const dynamic = "force-dynamic";

/** Send the e-mail of one paid order again (the code is still waiting encrypted; no second code is made). Owner only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Pesanan tidak sah.");
    const body = await readBody(request);
    if (body.action !== "resend") return bad("Tindakan tidak dikenali.");
    const result = await deliverOrder(getDb(), { codeKey: codeKey(), mailer: mailer(), siteUrl: SITE_URL }, id);
    await logActivity({ action: "subscription.order.resend", subjectType: "order", subjectId: id, summary: `Hantar semula e-mel pesanan: ${result}` });
    if (result === "skipped") return bad("Tiada e-mel yang menunggu bagi pesanan ini, atau ia baru dicuba. Tunggu setengah minit dan cuba lagi.", 409);
    return json({ result });
  });
}
