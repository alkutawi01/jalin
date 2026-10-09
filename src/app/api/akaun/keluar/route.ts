import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { clearReaderCookie, isSameOrigin, noStore, notFoundWhenOff, readerTokenFrom } from "../../../../lib/reader-auth/http";
import { signOut } from "../../../../lib/reader-auth/service";

export const dynamic = "force-dynamic";

/** Sign this device out. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const token = readerTokenFrom(request);
  if (token) await signOut(getDb(), token);
  const response = noStore(NextResponse.json({ ok: true }));
  clearReaderCookie(response);
  return response;
}
