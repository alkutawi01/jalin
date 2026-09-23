/**
 * Admin Authentication Boundary
 *
 * Production-safe authentication using simple token-based approach.
 * Single-owner admin access with environment-based configuration.
 *
 * Environment variables:
 * - ADMIN_SECRET: Required in production. Secret token for admin login.
 * - ADMIN_ALLOWED_EMAILS: Comma-separated list of allowed admin emails.
 * - ADMIN_DEV_BYPASS: Set to "true" to enable dev bypass (development only).
 */

import { cookies } from "next/headers";
import crypto from "crypto";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin";
}

const SESSION_COOKIE = "jalin-admin-session";
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if admin access is allowed.
 * In development mode with dev bypass enabled, always returns true.
 * In production, requires valid session.
 */
export async function isAdminAllowed(): Promise<boolean> {
  // Development mode with explicit dev bypass
  if (process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_BYPASS === "true") {
    return true;
  }

  // Production: check for valid session
  const user = await getCurrentAdmin();
  return user !== null;
}

/**
 * Get current admin user from session.
 * Returns null if not authenticated.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  // Development mode with explicit dev bypass
  if (process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_BYPASS === "true") {
    return {
      id: "dev-admin",
      name: "Development Admin",
      email: "admin@jalin.local",
      role: "admin",
    };
  }

  // Check session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  // Validate session token
  return validateSession(sessionToken);
}

/**
 * Login with admin credentials.
 * Returns session token if valid.
 */
export async function loginAdmin(email: string, password: string): Promise<string | null> {
  // Check if admin secret is configured
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("[AdminAuth] ADMIN_SECRET not configured.");
    return null;
  }

  // Check if email is in allowlist
  const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS?.split(",").map(e => e.trim()) || [];
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    console.warn(`[AdminAuth] Email "${email}" not in allowlist.`);
    return null;
  }

  // Validate password against admin secret
  if (password !== adminSecret) {
    console.warn("[AdminAuth] Invalid password attempt.");
    return null;
  }

  // Create session token
  const sessionData = {
    id: `admin-${crypto.createHash("sha256").update(email).digest("hex").slice(0, 12)}`,
    name: email.split("@")[0],
    email,
    role: "admin" as const,
    expires: Date.now() + SESSION_EXPIRY,
  };

  // Sign session data
  const sessionToken = signSession(sessionData);

  return sessionToken;
}

/**
 * Logout admin by clearing session.
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Set session cookie.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY / 1000,
  });
}

/**
 * Sign session data with HMAC.
 */
function signSession(data: Record<string, unknown>): string {
  const secret = process.env.ADMIN_SECRET || "dev-secret";
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

/**
 * Validate and decode session token.
 */
function validateSession(token: string): AdminUser | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) {
      return null;
    }

    // Verify signature
    const secret = process.env.ADMIN_SECRET || "dev-secret";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    if (signature !== expectedSignature) {
      console.warn("[AdminAuth] Invalid session signature.");
      return null;
    }

    // Decode payload
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());

    // Check expiry
    if (data.expires && data.expires < Date.now()) {
      console.warn("[AdminAuth] Session expired.");
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
    };
  } catch (error) {
    console.error("[AdminAuth] Session validation error:", error);
    return null;
  }
}

/**
 * Check if current admin has required role.
 */
export async function hasAdminRole(requiredRole: AdminUser["role"]): Promise<boolean> {
  const user = await getCurrentAdmin();
  if (!user) return false;

  // For MVP, all authenticated admins have admin role
  return user.role === requiredRole;
}

/**
 * Get required environment variables for auth.
 */
export function getAuthEnvVars(): {
  hasSecret: boolean;
  hasAllowedEmails: boolean;
  devBypassEnabled: boolean;
} {
  return {
    hasSecret: !!process.env.ADMIN_SECRET,
    hasAllowedEmails: !!process.env.ADMIN_ALLOWED_EMAILS,
    devBypassEnabled: process.env.ADMIN_DEV_BYPASS === "true",
  };
}
