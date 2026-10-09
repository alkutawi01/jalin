import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { runDailyChore } from "../../../../lib/reader-auth/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called once a day by Vercel Cron with "Authorization: Bearer <CRON_SECRET>". Anyone else gets a plain 401 and nothing runs. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const same = secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!same) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await runDailyChore(getDb());
    return NextResponse.json({ ok: !result.export.error, stored: result.export.stored, lines: result.export.lines, swept: result.swept, error: result.export.error ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cron penyelenggaraan]", error);
    return NextResponse.json({ ok: false, error: "Gagal." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
