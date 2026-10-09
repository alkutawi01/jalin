import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { asString, isSameOrigin, macKey, mailer, noStore, notFoundWhenOff, readJson, visitorMac } from "../../../../lib/reader-auth/http";
import { requestLoginCode } from "../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** "Send me a sign-in code." The answer is the same whether or not the address has an account and whether or not it was throttled. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });

  const body = await readJson(request);
  const result = await requestLoginCode(getDb(), { key: macKey(), mailer: mailer() }, { email: asString(body.email), ipMac: visitorMac(request) });

  if (!result.ok && result.reason === "invalid_email") {
    return noStore(NextResponse.json({ error: "Alamat emel tidak sah." }, { status: 400 }));
  }
  if (!result.ok && result.reason === "mail_failed") {
    return noStore(NextResponse.json({ error: "Kod tidak dapat dihantar sekarang. Cuba lagi sebentar lagi." }, { status: 503 }));
  }
  return noStore(NextResponse.json({ ok: true, message: "Jika alamat itu boleh menerima emel, kod telah dihantar. Kod sah selama 5 minit. Jika tiada, tunggu seminit sebelum meminta semula." }));
}
