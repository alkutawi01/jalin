import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { createStaff, invitationText, listStaff, UserInputError } from "../../../../lib/admin/user-service";
import { errorText } from "../../../../lib/admin/error-text";

/** Only the owner manages accounts (the middleware checks "user.manage"; this is the second lock). */
async function ownerOnly() {
  const admin = await getCurrentAdmin();
  return admin && admin.role === "admin" ? admin : null;
}

export async function GET() {
  if (!(await ownerOnly())) return NextResponse.json({ error: "Anda tidak mempunyai kebenaran untuk tindakan ini." }, { status: 403 });
  try {
    return NextResponse.json({ users: await listStaff() });
  } catch (error) {
    console.error("[UsersAPI] list failed:", error);
    return NextResponse.json({ error: "Senarai pengguna tidak dapat dimuatkan." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await ownerOnly();
  if (!admin) return NextResponse.json({ error: "Anda tidak mempunyai kebenaran untuk tindakan ini." }, { status: 403 });
  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    body = null;
  }
  if (!body) return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
  try {
    const { user, tempPassword } = await createStaff(
      { username: body.username, displayName: body.displayName, email: body.email, role: body.role },
      admin.id
    );
    return NextResponse.json({ user, invitation: invitationText(user, tempPassword, new URL(request.url).origin) }, { status: 201 });
  } catch (error) {
    if (error instanceof UserInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[UsersAPI] create failed:", error);
    return NextResponse.json({ error: `Akaun tidak dapat dicipta. ${errorText(error)}` }, { status: 500 });
  }
}
