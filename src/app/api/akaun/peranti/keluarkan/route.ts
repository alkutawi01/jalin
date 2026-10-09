import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { asString, currentSession, isSameOrigin, noStore, notFoundWhenOff, readJson } from "../../../../../lib/reader-auth/http";
import { revokeDevice } from "../../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** Remove one of this account's other devices. Removing the device in use is done by signing out instead. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Anda belum log masuk." }, { status: 401 }));
  const deviceId = asString((await readJson(request)).deviceId, 64);
  if (!deviceId || deviceId === current.session.device.id) return noStore(NextResponse.json({ error: "Peranti tidak sah." }, { status: 400 }));
  const done = await revokeDevice(getDb(), current.session.account.id, deviceId);
  return noStore(done ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Peranti tidak dijumpai." }, { status: 404 }));
}
