import { getDb } from "../../../../lib/db";
import { codeKey, mailer, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { deliverOrder, fulfilPaidOrder } from "../../../../lib/reader-auth/orders";
import { SITE_URL } from "../../../../lib/seo";
import { billplzConfigFromEnv, parseBillplzCallback, verifyBillplzSignature } from "../../../../lib/subscription/billplz";

export const dynamic = "force-dynamic";

const plain = (text: string, status: number) => new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * The payment gateway tells us a bill was paid (server to server). Only a call with a valid signature counts; the page the buyer is sent
 * back to proves nothing. The order is paid at most once however many times this is called, then the e-mail with the code is sent, and a
 * failed e-mail never fails this call (the gateway would only call again): it is tried again later (orders.ts).
 * This keeps working when new purchases are switched off, so a payment already made is still honoured.
 */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const config = billplzConfigFromEnv();
  if (!config) return plain("Tidak tersedia.", 404);

  const params: Record<string, string> = {};
  try {
    for (const [key, value] of await request.formData()) if (typeof value === "string" && key.length <= 60 && value.length <= 500) params[key] = value;
  } catch {
    return plain("Permintaan tidak sah.", 400);
  }
  if (!verifyBillplzSignature(params, config.xSignatureKey)) return plain("Tandatangan tidak sah.", 400);
  const callback = parseBillplzCallback(params);
  if (!callback) return plain("Permintaan tidak sah.", 400);
  if (!callback.paid) return plain("OK", 200);

  const db = getDb();
  const result = await fulfilPaidOrder(db, { codeKey: codeKey() }, { billId: callback.billId, paidAmountSen: callback.paidAmountSen });
  if (result.status === "issued" || result.status === "already") {
    try {
      await deliverOrder(db, { codeKey: codeKey(), mailer: mailer(), siteUrl: SITE_URL }, result.orderId);
    } catch (error) {
      console.error("[panggilan-balik] e-mel tidak dapat dihantar sekarang:", (error as Error).message);
    }
  } else {
    console.error(`[panggilan-balik] bil ${callback.billId}: ${result.status}`);
  }
  return plain("OK", 200);
}
