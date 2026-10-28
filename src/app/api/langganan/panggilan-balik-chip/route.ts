import { getDb } from "../../../../lib/db";
import { codeKey, mailer, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { deliverOrder, fulfilPaidOrder } from "../../../../lib/reader-auth/orders";
import { SITE_URL } from "../../../../lib/seo";
import { chipConfigFromEnv, chipPurchaseIdFromCallback, fetchChipPurchase } from "../../../../lib/subscription/chip";

export const dynamic = "force-dynamic";

const plain = (text: string, status: number) => new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * CHIP says a purchase was paid (server to server, JSON). The body is NOT believed: it only names a purchase, and what happened to it is
 * asked of CHIP itself with our secret key (chip.ts). So a forged call can do nothing but make us ask. The order is paid at most once however
 * many times this is called (CHIP repeats callbacks), the e-mail with the code is sent, and a failed e-mail never fails this call.
 * If CHIP cannot be reached the answer is 503, so CHIP calls again (it tries up to 8 more times over 36 hours).
 * This keeps working when new purchases are switched off, so a payment already made is still honoured.
 */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const config = chipConfigFromEnv();
  if (!config) return plain("Tidak tersedia.", 404);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 200_000) return plain("Terlalu besar.", 413);
    body = JSON.parse(text);
  } catch {
    return plain("Permintaan tidak sah.", 400);
  }
  const purchaseId = chipPurchaseIdFromCallback(body);
  if (!purchaseId) return plain("Permintaan tidak sah.", 400);

  const db = getDb();
  // Only a purchase we made ourselves is looked up at CHIP at all.
  const order = await db.selectFrom("purchase_orders").select(["id", "reference"]).where("provider", "=", "chip").where("provider_bill_id", "=", purchaseId).executeTakeFirst();
  if (!order) return plain("OK", 200);

  let purchase;
  try {
    purchase = await fetchChipPurchase(config, purchaseId);
  } catch (error) {
    console.error("[panggilan-balik-chip] CHIP tidak dapat dihubungi:", (error as Error).message);
    return plain("Cuba lagi.", 503);
  }
  if (purchase.status !== "paid") return plain("OK", 200);
  if (purchase.reference !== null && purchase.reference !== order.reference) {
    console.error(`[panggilan-balik-chip] ${purchaseId}: rujukan tidak sepadan`);
    return plain("OK", 200);
  }

  const result = await fulfilPaidOrder(
    db,
    { codeKey: codeKey(), allowTestPayments: process.env.ALLOW_TEST_PAYMENTS === "yes" },
    { provider: "chip", billId: purchaseId, paidAmountSen: purchase.paidSen ?? purchase.totalSen, isTest: purchase.isTest }
  );
  if (result.status === "issued" || result.status === "already") {
    try {
      await deliverOrder(db, { codeKey: codeKey(), mailer: mailer(), siteUrl: SITE_URL }, result.orderId);
    } catch (error) {
      console.error("[panggilan-balik-chip] e-mel tidak dapat dihantar sekarang:", (error as Error).message);
    }
  } else {
    console.error(`[panggilan-balik-chip] pembelian ${purchaseId}: ${result.status}`);
  }
  return plain("OK", 200);
}
