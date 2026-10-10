/** One signing key for owner and staff sessions. The legacy secret is a rollout fallback only. */
export function adminSessionSigningKey(env: Record<string, string | undefined> = process.env): string | null {
  const dedicated = env.ADMIN_SESSION_KEY?.trim();
  if (dedicated) return dedicated.length >= 32 ? dedicated : null;
  return env.ADMIN_SECRET?.trim() || null;
}

export function hasDedicatedAdminSessionKey(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.ADMIN_SESSION_KEY?.trim() && env.ADMIN_SESSION_KEY.trim().length >= 32;
}
