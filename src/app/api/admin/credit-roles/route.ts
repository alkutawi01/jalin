import { NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { getDb, hasDb } from "../../../../lib/db";
import { STANDARD_ROLES } from "../../../../lib/credit-roles";

/** GET /api/admin/credit-roles: roles editors added earlier (custom labels in use), for the credit dropdown. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ custom: [] });

  const rows = await getDb().selectFrom("credits").select("role_label").distinct().execute();
  const standard = new Set(STANDARD_ROLES.map((role) => role.value));
  const custom = rows
    .map((row) => (row.role_label ?? "").trim())
    .filter((role) => role && !standard.has(role) && /^[A-Z]/.test(role))
    .sort((a, b) => a.localeCompare(b, "ms"));
  return NextResponse.json({ custom });
}
