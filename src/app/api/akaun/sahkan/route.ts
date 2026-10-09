import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { asString, isSameOrigin, macKey, noStore, notFoundWhenOff, readJson, setReaderCookie, visitorMac } from "../../../../lib/reader-auth/http";
import { verifyLoginCode } from "../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** "Here is the code." A correct code signs this device in; a third device is asked which of the two to replace first. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });

  const body = await readJson(request);
  const result = await verifyLoginCode(
    getDb(),
    { key: macKey() },
    {
      email: asString(body.email),
      code: asString(body.code, 20),
      ipMac: visitorMac(request),
      deviceLabel: asString(body.label, 60),
      replaceDeviceId: asString(body.replaceDeviceId, 64) || undefined,
    }
  );

  if (result.status === "ok") {
    const response = noStore(NextResponse.json({ ok: true, isNewAccount: result.isNewAccount, trialEndsAt: result.trialEndsAt }));
    setReaderCookie(response, result.token);
    return response;
  }
  if (result.status === "choose_device") {
    return noStore(NextResponse.json({ needsDeviceChoice: true, devices: result.devices }));
  }
  if (result.status === "throttled") {
    return noStore(NextResponse.json({ error: "Terlalu banyak cubaan. Cuba lagi kemudian." }, { status: 429 }));
  }
  return noStore(NextResponse.json({ error: "Kod tidak betul atau sudah tamat." }, { status: 400 }));
}
