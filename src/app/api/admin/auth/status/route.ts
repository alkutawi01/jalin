import { NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";

/**
 * What the table says about the signed-in account right now. The middleware (which cannot reach the database) asks this before it lets a
 * staff account through to an admin API, so switching an account off, or changing its role, closes the API at once and not only the pages.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ ok: true, role: admin.role, mustChangePassword: admin.mustChangePassword === true }, { headers: { "Cache-Control": "no-store" } });
}
