import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { currentSession, isSameOrigin, noStore, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { isSaved, setSaved } from "../../../../lib/reader-auth/library";

export const dynamic = "force-dynamic";

/** Is this work on the reader's saved list? ?slug= */
export async function GET(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ saved: false }, { status: 401 }));
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  return noStore(NextResponse.json({ saved: await isSaved(getDb(), current.session.account.id, slug) }));
}

/** Save or unsave a work: { slug, saved }. */
export async function POST(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak dibenarkan." }, { status: 403 });
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ error: "Log masuk untuk menyimpan karya." }, { status: 401 }));
  const body = (await request.json().catch(() => ({}))) as { slug?: unknown; saved?: unknown };
  const slug = typeof body.slug === "string" ? body.slug : "";
  const saved = body.saved === true;
  const ok = await setSaved(getDb(), current.session.account.id, slug, saved);
  return noStore(NextResponse.json({ ok, saved: ok ? saved : false }, { status: ok ? 200 : 404 }));
}
