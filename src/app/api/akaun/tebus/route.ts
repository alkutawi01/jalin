import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { asString, codeKey, currentSession, isSameOrigin, noStore, notFoundWhenOff, previousCodeKeys, readJson, visitorMac } from "../../../../lib/reader-auth/http";
import { redeemCode } from "../../../../lib/reader-auth/redeem";
import { formatEndMYT } from "../../../../lib/subscription/periods";

export const dynamic = "force-dynamic";

const REFUSED = "Kod tidak dapat ditebus. Semak kod dan nombor batch pada kad, atau hubungi sokongan Jalin.";

/**
 * "Redeem this code." One endpoint for card codes (code and batch number) and shared codes (the code alone). Every kind of failure
 * gives the same refusal, so a wrong guess learns nothing; the only different answers are to a reader who already used the very code
 * and to the stop switch and the rate limit.
 */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Log masuk dahulu untuk menebus kod." }, { status: 401 }));

  const body = await readJson(request);
  const result = await redeemCode(
    getDb(),
    { codeKey: codeKey(), previousCodeKeys: previousCodeKeys() },
    { accountId: current.session.account.id, ipMac: visitorMac(request), code: asString(body.code, 60), batch: asString(body.batch, 40) }
  );

  if (result.status === "ok") {
    const until = result.accessEndsAt ? formatEndMYT(result.accessEndsAt) : formatEndMYT(result.endsAt);
    return noStore(NextResponse.json({ ok: true, message: `Kod berjaya ditebus. Akses anda aktif sehingga ${until}.`, accessEndsAt: result.accessEndsAt ?? result.endsAt }));
  }
  if (result.status === "already") return noStore(NextResponse.json({ error: "Anda sudah menebus kod ini." }, { status: 409 }));
  if (result.status === "throttled") return noStore(NextResponse.json({ error: "Terlalu banyak cubaan. Cuba lagi sebentar lagi." }, { status: 429 }));
  if (result.status === "halted") return noStore(NextResponse.json({ error: "Penebusan dihentikan buat sementara. Cuba lagi nanti." }, { status: 503 }));
  return noStore(NextResponse.json({ error: REFUSED }, { status: 400 }));
}
