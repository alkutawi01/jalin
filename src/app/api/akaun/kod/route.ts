import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { asString, isSameOrigin, macKey, mailer, noStore, notFoundWhenOff, readJson, visitorMac } from "../../../../lib/reader-auth/http";
import { loginChallengeNeeded, requestLoginCode } from "../../../../lib/reader-auth/service";
import { turnstileConfig, verifyTurnstile } from "../../../../lib/reader-auth/turnstile";

export const dynamic = "force-dynamic";

/** "Send me a sign-in code." The answer is the same whether or not the address has an account and whether or not it was throttled. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });

  const body = await readJson(request);

  // The bot challenge, only when this visitor or the day's mail budget calls for it and only when its keys are set.
  // Without a token the answer asks for one and nothing is sent or counted.
  const turnstile = turnstileConfig();
  if (turnstile && (await loginChallengeNeeded(getDb(), {}, { ipMac: visitorMac(request) }))) {
    const token = asString(body.turnstileToken);
    if (!token) return noStore(NextResponse.json({ ok: false, challenge: true, siteKey: turnstile.siteKey }));
    const verdict = await verifyTurnstile(token, turnstile.secret);
    if (verdict === "fail") {
      return noStore(NextResponse.json({ ok: false, challenge: true, siteKey: turnstile.siteKey, error: "Pengesahan keselamatan tidak berjaya. Cuba lagi." }));
    }
    // Cloudflare could not be reached: carry on rather than close sign-in for everyone, and say so in the log.
    if (verdict === "unavailable") console.warn("Turnstile unavailable: continuing without the challenge.");
  }

  const result = await requestLoginCode(getDb(), { key: macKey(), mailer: mailer() }, { email: asString(body.email), ipMac: visitorMac(request) });

  if (!result.ok && result.reason === "invalid_email") {
    return noStore(NextResponse.json({ error: "Alamat e-mel tidak sah." }, { status: 400 }));
  }
  if (!result.ok && result.reason === "mail_failed") {
    return noStore(NextResponse.json({ error: "Kod tidak dapat dihantar sekarang. Cuba lagi sebentar lagi." }, { status: 503 }));
  }
  return noStore(NextResponse.json({ ok: true, message: "Jika alamat itu boleh menerima e-mel, kod telah dihantar. Kod sah selama 5 minit. Jika tiada, tunggu seminit sebelum meminta semula." }));
}
