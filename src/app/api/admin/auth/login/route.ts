import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, signIn } from "../../../../../lib/admin/auth";

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
      return NextResponse.json({ error: "Nama pengguna diperlukan." }, { status: 400 });
    }
    if (typeof body.password !== "string" || !body.password) {
      return NextResponse.json({ error: "Kata laluan diperlukan." }, { status: 400 });
    }

    // The owner (e-mail + ADMIN_SECRET) or a staff account (username or e-mail + own password).
    const outcome = await signIn(email, body.password);

    if ("error" in outcome) {
      const message = outcome.error === "locked"
        ? "Terlalu banyak percubaan. Cuba lagi selepas 15 minit."
        : outcome.error === "inactive"
          ? "Akaun ini telah dimatikan. Hubungi pemilik Jalin."
          : outcome.error === "expired"
            ? "Jemputan ini telah tamat tempoh. Minta pemilik Jalin menghantar jemputan yang baharu."
            : "Nama pengguna atau kata laluan tidak sah.";
      return NextResponse.json({ error: message }, { status: outcome.error === "locked" ? 429 : 401 });
    }

    // Set session cookie. A staff session is shorter; one with a temporary password may only go on to choose its own.
    const staff = outcome.token.length > 0 && JSON.parse(Buffer.from(outcome.token.split(".")[0]!, "base64url").toString()).role !== "admin";
    await setSessionCookie(outcome.token, staff);

    return NextResponse.json({ success: true, mustChangePassword: staff && JSON.parse(Buffer.from(outcome.token.split(".")[0]!, "base64url").toString()).mcp === true });
  } catch (error) {
    console.error("[LoginAPI] Error:", error);
    return NextResponse.json(
      { error: "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
