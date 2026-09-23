import { NextResponse } from "next/server";
import { logoutAdmin } from "../../../../../lib/admin/auth";

export async function POST() {
  try {
    await logoutAdmin();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LogoutAPI] Error:", error);
    return NextResponse.json(
      { error: "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
