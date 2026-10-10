import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { currentSession, isSameOrigin, noStore, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { clearReading, recordProgress } from "../../../../lib/reader-auth/library";

export const dynamic = "force-dynamic";

/** Remember the place the reader is at: { workId, sectionSlug? }. Quiet: a visitor or an odd request gets a plain refusal, nothing more. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ ok: false }, { status: 401 }));
  const body = (await request.json().catch(() => ({}))) as { workId?: unknown; sectionSlug?: unknown };
  const workId = typeof body.workId === "string" ? body.workId : "";
  const section = typeof body.sectionSlug === "string" && body.sectionSlug ? body.sectionSlug : null;
  const ok = await recordProgress(getDb(), current.session.account.id, workId, section);
  return noStore(NextResponse.json({ ok }, { status: ok ? 200 : 400 }));
}

/** Clear the whole list. */
export async function DELETE(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Anda belum log masuk." }, { status: 401 }));
  await clearReading(getDb(), current.session.account.id);
  return noStore(NextResponse.json({ ok: true }));
}
