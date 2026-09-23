import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, setSessionCookie } from "../../../../../lib/admin/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email diperlukan." }, { status: 400 });
    }
    if (!body.password) {
      return NextResponse.json({ error: "Password diperlukan." }, { status: 400 });
    }

    const token = await loginAdmin(body.email.trim(), body.password);

    if (!token) {
      return NextResponse.json(
        { error: "Email atau password tidak sah." },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LoginAPI] Error:", error);
    return NextResponse.json(
      { error: "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
