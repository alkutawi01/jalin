import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { codeKey, mailer, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { retryPendingDeliveries } from "../../../../lib/reader-auth/orders";
import { SITE_URL } from "../../../../lib/seo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends again every e-mail with a bought code that has not gone yet. Meant to be called every few minutes by the host's scheduler with
 * "Authorization: Bearer <CRON_SECRET>". The buyer's thank-you page and the admin's button do the same job, so nothing depends on this
 * alone, but it is what makes a failed e-mail arrive without anyone doing anything.
 */
export async function GET(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const secret = process.env.CRON_SECRET?.trim();
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const same = secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!same) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await retryPendingDeliveries(getDb(), { codeKey: codeKey(), mailer: mailer(), siteUrl: SITE_URL }, 20);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cron pesanan]", (error as Error).message);
    return NextResponse.json({ ok: false, error: "Gagal." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
