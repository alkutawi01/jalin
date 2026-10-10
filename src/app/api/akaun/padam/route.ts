import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { clearReaderCookie, currentSession, isSameOrigin, noStore, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { deleteAccount } from "../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** The reader deletes their own account. The body must say { confirm: "PADAM" } so a stray request cannot do it. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Anda belum log masuk." }, { status: 401 }));
  const body = (await request.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== "PADAM") return noStore(NextResponse.json({ error: "Sahkan dengan menaip PADAM." }, { status: 400 }));
  const done = await deleteAccount(getDb(), current.session.account.id);
  if (!done) return noStore(NextResponse.json({ error: "Akaun tidak dijumpai." }, { status: 404 }));
  const response = noStore(NextResponse.json({ ok: true }));
  clearReaderCookie(response);
  return response;
}
