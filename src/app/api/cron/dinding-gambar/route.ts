import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { generateWall } from "../../../../lib/reader/start-wall";
import { wallSources } from "../../../../lib/reader/start-wall-sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called by Vercel Cron on the 1st of each month with "Authorization: Bearer <CRON_SECRET>": makes the picture behind /mula. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const same = secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!same) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await generateWall(getDb(), await wallSources(), "cron");
    return NextResponse.json(result.ok ? { ok: true, month: result.wall.month, bytes: result.bytes, pictures: result.pictures } : { ok: false, error: result.error }, { status: result.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cron dinding-gambar]", error);
    return NextResponse.json({ ok: false, error: "Gagal." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
