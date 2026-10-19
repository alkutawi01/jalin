/**
 * Cloudflare Turnstile, asked only when needed (docs/CABARAN_BOT_DAN_PERCUBAAN.md). Off unless both keys are set, so nothing changes
 * until the keys are put in Vercel. Pure apart from the one fetch, which is injectable for tests.
 */
export type TurnstileConfig = { siteKey: string; secret: string };

export function turnstileConfig(env: Record<string, string | undefined> = process.env): TurnstileConfig | null {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim();
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secret ? { siteKey, secret } : null;
}

/** ok: Cloudflare accepted the token. fail: Cloudflare refused it. unavailable: Cloudflare could not be reached in time. */
export type TurnstileResult = "ok" | "fail" | "unavailable";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export async function verifyTurnstile(
  token: string,
  secret: string,
  deps: { fetch?: typeof fetch; timeoutMs?: number } = {}
): Promise<TurnstileResult> {
  const value = token.trim();
  if (!value || value.length > MAX_TOKEN_LENGTH) return "fail";
  const doFetch = deps.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 4000);
  try {
    const response = await doFetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: value }).toString(),
      signal: controller.signal,
    });
    if (!response.ok) return "unavailable";
    const data = (await response.json()) as { success?: boolean };
    return data.success === true ? "ok" : "fail";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timer);
  }
}
