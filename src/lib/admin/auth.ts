/**
 * Admin Authentication Boundary
 *
 * This module provides a temporary authentication bypass for development.
 * In production, this will be replaced with proper auth (NextAuth, etc.).
 *
 * IMPORTANT: This is a PLACEHOLDER implementation.
 * Do NOT use in production without proper authentication.
 */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

/**
 * Check if admin access is allowed.
 * In development mode, always returns true.
 * In production, this will check for valid session.
 */
export function isAdminAllowed(): boolean {
  // Development mode: allow all access
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // Production: check for proper auth (TODO: implement with NextAuth)
  console.warn(
    "[AdminAuth] Production auth not implemented yet. Access denied."
  );
  return false;
}

/**
 * Get current admin user.
 * In development mode, returns a mock user.
 * In production, this will return the authenticated user.
 */
export function getCurrentAdmin(): AdminUser | null {
  if (!isAdminAllowed()) {
    return null;
  }

  // Development mode: return mock user
  if (process.env.NODE_ENV === "development") {
    return {
      id: "dev-admin",
      name: "Development Admin",
      email: "admin@jalin.local",
      role: "admin",
    };
  }

  // Production: get from session (TODO: implement with NextAuth)
  return null;
}

/**
 * Check if current admin has required role.
 */
export function hasAdminRole(requiredRole: AdminUser["role"]): boolean {
  const user = getCurrentAdmin();
  if (!user) return false;

  const roleHierarchy: Record<AdminUser["role"], number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}
