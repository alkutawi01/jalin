import { NextRequest, NextResponse } from "next/server";
import { isAllowed, roleFromClaim, type Role } from "./lib/admin/permissions";

/**
 * Validate session token using Web Crypto API (Edge-compatible).
 */
async function validateSessionToken(token: string): Promise<Role | null> {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) {
      return null;
    }

    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      console.error("[Middleware] ADMIN_SECRET not configured.");
      return null;
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
      return null;
    }

    const sigBytes = encoder.encode(signature);
    const expBytes = encoder.encode(expectedSignature);
    let result = 0;
    for (let i = 0; i < sigBytes.length; i++) {
      result |= sigBytes[i]! ^ expBytes[i]!;
    }

    if (result !== 0) {
      return null;
    }

    // Decode and check expiry
    const data_str = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(data_str);
    if (parsed.expires && parsed.expires < Date.now()) {
      return null;
    }

    // The role the session says it has ("admin" is today's single account: the owner).
    return roleFromClaim(parsed.role);
  } catch {
    return null;
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
        { error: "Sesi anda telah tamat. Log masuk semula." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate session token (HMAC + expiry + role)
  const role = await validateSessionToken(sessionCookie.value);
  if (!role) {
    // Invalid/forged/expired session - reject and clear cookie
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: "Sesi anda telah tamat. Log masuk semula." },
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

  // A valid session still needs the permission this address and method ask for (see lib/admin/permissions).
  if (!isAllowed(role, request.method, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Anda tidak mempunyai kebenaran untuk tindakan ini." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
