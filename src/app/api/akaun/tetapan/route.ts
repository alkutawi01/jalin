import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { currentSession, isSameOrigin, noStore, notFoundWhenOff, readJson } from "../../../../lib/reader-auth/http";
import { getPrefs, setPrefs } from "../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** Reading settings (font size, spacing, width, theme, typeface, dimming). Only a signed-in account has them. */
export async function GET(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Anda belum log masuk." }, { status: 401 }));
  return noStore(NextResponse.json({ prefs: await getPrefs(getDb(), current.session.account.id) }));
}

export async function PUT(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Anda belum log masuk." }, { status: 401 }));
  const prefs = await setPrefs(getDb(), current.session.account.id, await readJson(request));
  return noStore(NextResponse.json({ prefs }));
}
