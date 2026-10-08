import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, setSessionCookie, staffSessionToken } from "../../../../../lib/admin/auth";
import { changeOwnPassword, getStaff, UserInputError } from "../../../../../lib/admin/user-service";

/** A staff account chooses its own password (the owner's password is ADMIN_SECRET and is not changed here). */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  if (admin.role === "admin") return NextResponse.json({ error: "Kata laluan pemilik ditetapkan oleh pelayan, bukan di sini." }, { status: 400 });
  let body: { current?: unknown; next?: unknown } | null = null;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === "object" ? (parsed as { current?: unknown; next?: unknown }) : null;
  } catch {
    body = null;
  }
  if (!body || typeof body.current !== "string" || typeof body.next !== "string") {
    return NextResponse.json({ error: "Kata laluan semasa dan kata laluan baharu diperlukan." }, { status: 400 });
  }
  const userId = admin.id.replace(/^u-/, "");
  try {
    await changeOwnPassword(userId, body.current, body.next);
    const user = (await getStaff(userId))!;
    await setSessionCookie(staffSessionToken(user), true);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UserInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[ChangePasswordAPI] failed:", error);
    return NextResponse.json({ error: "Kata laluan tidak dapat ditukar." }, { status: 500 });
  }
}
