import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { updateStaff, UserInputError } from "../../../../../lib/admin/user-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Anda tidak mempunyai kebenaran untuk tindakan ini." }, { status: 403 });
  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    body = null;
  }
  if (!body) return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
  const { id } = await params;
  try {
    const user = await updateStaff(id, { role: body.role, active: body.active, displayName: body.displayName });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof UserInputError) return NextResponse.json({ error: error.message }, { status: error.message.endsWith("ditemui.") ? 404 : 400 });
    console.error("[UsersAPI] update failed:", error);
    return NextResponse.json({ error: "Akaun tidak dapat dikemas kini." }, { status: 500 });
  }
}
