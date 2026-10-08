import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { invitationText, resetStaffPassword, UserInputError } from "../../../../../../lib/admin/user-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Anda tidak mempunyai kebenaran untuk tindakan ini." }, { status: 403 });
  const { id } = await params;
  try {
    const { user, tempPassword } = await resetStaffPassword(id);
    return NextResponse.json({ user, invitation: invitationText(user, tempPassword, new URL(request.url).origin) });
  } catch (error) {
    if (error instanceof UserInputError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[UsersAPI] reset failed:", error);
    return NextResponse.json({ error: "Kata laluan tidak dapat ditetapkan semula." }, { status: 500 });
  }
}
