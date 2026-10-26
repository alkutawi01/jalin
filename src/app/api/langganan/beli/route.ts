import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { asString, isSameOrigin, noStore, notFoundWhenOff, readJson, visitorMac } from "../../../../lib/reader-auth/http";
import { attachBill, cancelOrder, countRecentOrdersByEmail, createOrder } from "../../../../lib/reader-auth/orders";
import { normaliseEmail } from "../../../../lib/reader-auth/primitives";
import { countEvents, recordEvent } from "../../../../lib/reader-auth/service";
import { SITE_URL } from "../../../../lib/seo";
import { billplzConfigFromEnv, createBillplzBill } from "../../../../lib/subscription/billplz";
import { purchaseStatus } from "../../../../lib/subscription/prices";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const PER_VISITOR_PER_HOUR = 10;
const PER_EMAIL_PER_HOUR = 5;

/**
 * "Buy a code." Anyone may start an order (no account is needed to pay); the code is made only after the gateway confirms the payment
 * (panggilan-balik), and is e-mailed. Answers with the gateway's payment page. The price comes from the server, never from the browser.
 */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const status = purchaseStatus();
  if (!status.enabled) return noStore(NextResponse.json({ error: "Pembelian belum dibuka." }, { status: 404 }));
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });

  const body = await readJson(request);
  const months = Number(body.months);
  if (months !== 1 && months !== 6 && months !== 12) return noStore(NextResponse.json({ error: "Pilih tempoh langganan." }, { status: 400 }));
  const email = normaliseEmail(asString(body.email, 254));
  if (!email) return noStore(NextResponse.json({ error: "Masukkan alamat e-mel yang sah. Kod akan dihantar ke alamat tersebut." }, { status: 400 }));

  const db = getDb();
  const now = new Date();
  const since = new Date(now.getTime() - HOUR);
  const visitor = `beli:${visitorMac(request)}`;
  if ((await countEvents(db, "request", "ip", visitor, since)) >= PER_VISITOR_PER_HOUR || (await countRecentOrdersByEmail(db, email, since)) >= PER_EMAIL_PER_HOUR) {
    return noStore(NextResponse.json({ error: "Terlalu banyak percubaan. Cuba lagi kemudian." }, { status: 429 }));
  }
  await recordEvent(db, "request", "ip", visitor, now);

  const order = await createOrder(db, { months, email, amountSen: status.prices[months] });
  try {
    const bill = await createBillplzBill(
      billplzConfigFromEnv()!,
      {
        name: "Pembaca Jalin", email, amountSen: status.prices[months], reference: order.reference,
        description: `Langganan Jalin ${months} bulan (${order.reference})`,
        callbackUrl: `${SITE_URL}/api/langganan/panggilan-balik`, redirectUrl: `${SITE_URL}/beli/selesai?ref=${order.reference}`,
      }
    );
    await attachBill(db, order.id, bill.id);
    return noStore(NextResponse.json({ ok: true, url: bill.url, reference: order.reference }));
  } catch (error) {
    console.error("[beli] bil tidak dapat dibuat:", (error as Error).message);
    await cancelOrder(db, order.id, "Gerbang bayaran tidak dapat membuat bil").catch(() => undefined);
    return noStore(NextResponse.json({ error: "Pembayaran tidak dapat dimulakan sekarang. Cuba lagi sebentar lagi." }, { status: 502 }));
  }
}
