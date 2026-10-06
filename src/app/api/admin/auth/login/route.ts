import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, setSessionCookie } from "../../../../../lib/admin/auth";

export async function POST(request: NextRequest) {
  try {
    // A body that is not JSON, or has an email or password that is not text, is the caller's mistake (400), not a server error.
    let body: { email?: unknown; password?: unknown } | null = null;
    try {
      const parsed: unknown = await request.json();
      body = parsed && typeof parsed === "object" ? (parsed as { email?: unknown; password?: unknown }) : null;
    } catch {
      body = null;
    }
    if (!body) {
      return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "Email diperlukan." }, { status: 400 });
    }
    if (typeof body.password !== "string" || !body.password) {
      return NextResponse.json({ error: "Password diperlukan." }, { status: 400 });
    }

    const token = await loginAdmin(email, body.password);

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
