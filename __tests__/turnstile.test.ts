/** Turnstile: off without both keys, and the verdicts of the server check (accepted, refused, Cloudflare unreachable). */
import { turnstileConfig, verifyTurnstile } from "../src/lib/reader-auth/turnstile";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

(async () => {
  assert(turnstileConfig({}) === null, "off with no keys");
  assert(turnstileConfig({ TURNSTILE_SITE_KEY: "site" }) === null && turnstileConfig({ TURNSTILE_SECRET_KEY: "secret" }) === null, "off with only one key");
  assert(turnstileConfig({ TURNSTILE_SITE_KEY: " site ", TURNSTILE_SECRET_KEY: " secret " })?.secret === "secret", "on with both keys, trimmed");

  let sent: { url: string; body: string } | null = null;
  const answer = (json: unknown, ok = true): typeof fetch => (async (url: string | URL | Request, init?: RequestInit) => {
    sent = { url: String(url), body: String(init?.body ?? "") };
    return { ok, json: async () => json } as Response;
  }) as typeof fetch;

  assert((await verifyTurnstile("tok", "sec", { fetch: answer({ success: true }) })) === "ok", "an accepted token is ok");
  assert(sent !== null && (sent as { url: string }).url.endsWith("/turnstile/v0/siteverify") && (sent as { body: string }).body.includes("secret=sec") && (sent as { body: string }).body.includes("response=tok"), "the secret and the token go to siteverify");
  assert((await verifyTurnstile("tok", "sec", { fetch: answer({ success: false, "error-codes": ["invalid-input-response"] }) })) === "fail", "a refused token fails");
  assert((await verifyTurnstile("", "sec", { fetch: answer({ success: true }) })) === "fail", "an empty token fails without asking Cloudflare");
  assert((await verifyTurnstile("x".repeat(3000), "sec", { fetch: answer({ success: true }) })) === "fail", "an absurdly long token fails without asking Cloudflare");
  assert((await verifyTurnstile("tok", "sec", { fetch: answer({}, false) })) === "unavailable", "an error answer from Cloudflare is unavailable");
  const boom = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
  assert((await verifyTurnstile("tok", "sec", { fetch: boom })) === "unavailable", "a network error is unavailable");
  const hang = ((_url: string, init?: RequestInit) => new Promise((_res, rej) => { init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))); })) as unknown as typeof fetch;
  assert((await verifyTurnstile("tok", "sec", { fetch: hang, timeoutMs: 30 })) === "unavailable", "no answer in time is unavailable");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
