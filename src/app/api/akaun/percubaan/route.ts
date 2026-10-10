import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { currentSession, isSameOrigin, macKey, noStore, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { startTrial } from "../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** "Start my free trial." A signed-in reader chooses it once; the answer says when it ends. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Log masuk dahulu untuk memulakan percubaan." }, { status: 401 }));
  const result = await startTrial(getDb(), { key: macKey() }, current.session.account.id);
  if (result.status === "ok") return noStore(NextResponse.json({ ok: true, startsAt: result.startsAt, endsAt: result.endsAt }));
  if (result.status === "already") return noStore(NextResponse.json({ ok: true, repeat: true, startsAt: result.startsAt, endsAt: result.endsAt }));
  if (result.status === "used") return noStore(NextResponse.json({ error: "Percubaan percuma bagi e-mel ini sudah digunakan. Tebus kod langganan untuk terus membaca." }, { status: 409 }));
  return noStore(NextResponse.json({ error: "Akaun tidak dijumpai." }, { status: 404 }));
}
