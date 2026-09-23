import { NextRequest, NextResponse } from "next/server";

/**
 * Validate session token using Web Crypto API (Edge-compatible).
 */
async function validateSessionToken(token: string): Promise<boolean> {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) {
      return false;
    }

    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      console.error("[Middleware] ADMIN_SECRET not configured.");
      return false;
    }

    // Use Web Crypto API for HMAC (Edge-compatible)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const data = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Constant-time comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    const sigBytes = encoder.encode(signature);
    const expBytes = encoder.encode(expectedSignature);
    let result = 0;
    for (let i = 0; i < sigBytes.length; i++) {
      result |= sigBytes[i]! ^ expBytes[i]!;
    }

    if (result !== 0) {
      return false;
    }

    // Decode and check expiry
    const data_str = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(data_str);
    if (parsed.expires && parsed.expires < Date.now()) {
      return false;
    }

    // Check role
    if (parsed.role !== "admin") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Allow login page and login API
  if (pathname === "/admin/login" || pathname === "/api/admin/auth/login") {
    return NextResponse.next();
  }

  // Development mode with explicit dev bypass
  if (process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_BYPASS === "true") {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("jalin-admin-session");

  // No session cookie - reject
  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate session token (HMAC + expiry + role)
  if (!(await validateSessionToken(sessionCookie.value))) {
    // Invalid/forged/expired session - reject and clear cookie
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      response.cookies.delete("jalin-admin-session");
      return response;
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("jalin-admin-session");
    return response;
  }

  // Valid session - continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
