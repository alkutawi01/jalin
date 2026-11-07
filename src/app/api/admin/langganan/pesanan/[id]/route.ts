import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { actor, bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../../lib/admin/langganan-api";
import { codeKey, mailer } from "../../../../../../lib/reader-auth/http";
import { deliverOrder } from "../../../../../../lib/reader-auth/orders";
import { SITE_URL } from "../../../../../../lib/seo";
import { replaceOrderCode } from "../../../../../../lib/reader-auth/order-replacement";
import { ORDER_REPLACEMENT_COPY as COPY } from "../../../../../../lib/subscription/order-replacement-copy";

export const dynamic = "force-dynamic";

/** Retry an unsent message, or deliberately replace a lost, already-sent unused code. Live owner only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return bad("Pesanan tidak sah.");
    const body = await readBody(request);
    if (body.action === "replace") {
      const reason = str(body.reason, 161);
      const expectedSerial = str(body.expectedSerial, 80);
      if (!reason || reason.length > 160 || !expectedSerial) return bad("Sebab penggantian (maksimum 160 aksara) dan nombor siri semasa diperlukan.");
      const who = await actor();
      if (who.id === "tidak-diketahui") return bad("Sesi pentadbir telah tamat. Log masuk semula.", 403);
      let replaced = false;
      try {
        const key = codeKey();
        const db = getDb();
        const result = await replaceOrderCode(db, { codeKey: key }, { orderId: id, expectedSerial, reason, actor: who });
        if (result.status === "unknown") return bad("Pesanan tidak dijumpai.", 404);
        if (result.status === "changed") return bad(COPY.changed, 409);
        if (result.status === "not_ready") return bad(COPY.notReady, 409);
        if (result.status === "unavailable") return bad(COPY.unavailable, 409);
        if (result.status === "expired") return bad(COPY.expired, 409);
        replaced = true;
        const delivery = await deliverOrder(db, { codeKey: key, mailer: mailer(), siteUrl: SITE_URL }, id);
        return json({ result: "replaced", delivery, message: delivery === "sent" ? COPY.sent : COPY.failed });
      } catch {
        // Database/mailer errors may carry SQL parameters. Never log or return those parameters.
        return replaced ? json({ result: "replaced", delivery: "pending", message: COPY.failed }) : bad("Status penggantian tidak dapat dipastikan. Muat semula senarai dan semak kod semasa sebelum mencuba lagi.", 500);
      }
    }
    if (body.action !== "resend") return bad("Tindakan tidak dikenali.");
    const result = await deliverOrder(getDb(), { codeKey: codeKey(), mailer: mailer(), siteUrl: SITE_URL }, id);
    await logActivity({ action: "subscription.order.resend", subjectType: "order", subjectId: id, summary: `Hantar semula e-mel pesanan: ${result}` });
    if (result === "skipped") return bad("Tiada e-mel yang menunggu bagi pesanan ini, atau ia baru dicuba. Tunggu setengah minit dan cuba lagi.", 409);
    return json({ result });
  });
}
