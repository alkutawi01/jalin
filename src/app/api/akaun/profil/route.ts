import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { asString, currentSession, isSameOrigin, noStore, notFoundWhenOff, readJson } from "../../../../lib/reader-auth/http";
import { setDisplayName } from "../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** The name shown on the account page. Optional, up to 60 characters. */
export async function PATCH(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Anda belum log masuk." }, { status: 401 }));
  const displayName = await setDisplayName(getDb(), current.session.account.id, asString((await readJson(request)).displayName, 200));
  return noStore(NextResponse.json({ displayName }));
}
