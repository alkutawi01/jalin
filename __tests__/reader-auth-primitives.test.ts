/** Reader sign-in: the pure pieces (addresses, keyed hashes, codes, tokens, mailer choice) and the request helpers. */
import {
  loadCodeKey,
  constantTimeEqualHex,
  emailLookupMac,
  generateOtp,
  generateSessionToken,
  hashSessionToken,
  ipMac,
  loadMacKey,
  loginCodeMessage,
  normaliseEmail,
  normaliseOtpInput,
  otpMac,
  resendMailer,
  selectMailer,
  trialClaimMac,
} from "../src/lib/reader-auth/primitives";
import { clientIp, isSameOrigin, readerAccountsEnabled, readerCookieName, readerTokenFrom } from "../src/lib/reader-auth/http";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

// Addresses.
assert(normaliseEmail("  Aina@Contoh.MY ") === "aina@contoh.my", "trimmed and lower case");
assert(normaliseEmail("a.b+c@contoh.my") === "a.b+c@contoh.my" && normaliseEmail("ab@contoh.my") !== normaliseEmail("a.b@contoh.my"), "dots and +tags are kept: two different people may own a.b@ and ab@");
assert(normaliseEmail("ａｉｎａ@contoh.my") === "aina@contoh.my", "full-width letters are folded");
for (const bad of ["", "aina", "aina@", "@contoh.my", "aina@contoh", "aina@@contoh.my", "ai na@contoh.my", "aina@contoh..my", "aina@-contoh.my", "a@b.c" + "x".repeat(260)]) {
  assert(normaliseEmail(bad) === null, `refused: ${JSON.stringify(bad.slice(0, 30))}`);
}
assert(normaliseEmail("aina@contoh.my\r\nBcc: x@y.my") === null, "a header-injection attempt is refused");

// Keys and hashes.
const hex = "ab".repeat(32);
const key = loadMacKey({ READER_MAC_KEY_ID: "k1", READER_MAC_KEY: hex });
assert(key.keyId === "k1" && key.key.length === 32, "a 64-hex key loads");
assert(throws(() => loadMacKey({ READER_MAC_KEY_ID: "k1", READER_MAC_KEY: "ab".repeat(16) })) && throws(() => loadMacKey({ READER_MAC_KEY: hex })) && throws(() => loadMacKey({})), "a short key, a missing id or no key is refused");
const codeEnv = { CODE_MAC_KEY_ID: "c1", CODE_MAC_KEY: "cd".repeat(32), READER_MAC_KEY: hex };
assert(loadCodeKey(codeEnv).keyId === "c1" && loadCodeKey(codeEnv).key.length === 32, "a 64-hex code key loads");
assert(throws(() => loadCodeKey({ CODE_MAC_KEY_ID: "c1", CODE_MAC_KEY: "cd".repeat(16) })) && throws(() => loadCodeKey({ CODE_MAC_KEY: "cd".repeat(32) })) && throws(() => loadCodeKey({})), "a short code key, a missing id or no key is refused");
assert(throws(() => loadCodeKey({ CODE_MAC_KEY_ID: "c1", CODE_MAC_KEY: hex, READER_MAC_KEY: hex.toUpperCase() })), "the code key must differ from the sign-in key");
const other = loadMacKey({ READER_MAC_KEY_ID: "k2", READER_MAC_KEY: "cd".repeat(32) });
assert(emailLookupMac(key, "a@b.my") === emailLookupMac(key, "a@b.my") && emailLookupMac(key, "a@b.my") !== emailLookupMac(other, "a@b.my"), "a keyed hash is stable and depends on the key");
assert(new Set([emailLookupMac(key, "a@b.my"), trialClaimMac(key, "a@b.my"), ipMac(key, "a@b.my")]).size === 3, "the same text hashes differently for different purposes");
assert(otpMac(key, "c1", "123456") !== otpMac(key, "c2", "123456") && otpMac(key, "c1", "123456") !== otpMac(key, "c1", "123457"), "a code is bound to its own challenge");
assert(!emailLookupMac(key, "aina@contoh.my").includes("aina"), "the hash does not contain the address");
assert(constantTimeEqualHex("abc", "abc") && !constantTimeEqualHex("abc", "abd") && !constantTimeEqualHex("abc", "abcd"), "constant-time compare");

// Codes and tokens.
{
  const seen = new Set<string>();
  const digits = new Array(10).fill(0);
  for (let i = 0; i < 6000; i++) { const code = generateOtp(); seen.add(code); for (const ch of code) digits[Number(ch)]++; if (!/^\d{6}$/.test(code)) assert(false, "otp shape", code); }
  assert(seen.size > 5900, "sign-in codes are different from each other", seen.size);
  assert(digits.every((n) => n > 3300 && n < 3900), "every digit appears about equally often", digits);
  assert(normaliseOtpInput("123 456") === "123456" && normaliseOtpInput("123-456") === "123456" && normaliseOtpInput("12345") === null && normaliseOtpInput("1234567") === null && normaliseOtpInput("12a456") === null, "typed code: spaces and hyphens ignored, exactly six digits");
  const tokens = new Set(Array.from({ length: 1000 }, generateSessionToken));
  const t = [...tokens][0];
  assert(tokens.size === 1000 && /^[A-Za-z0-9_-]{43}$/.test(t), "session tokens are 256-bit and URL-safe");
  assert(hashSessionToken(t) !== t && /^[0-9a-f]{64}$/.test(hashSessionToken(t)) && hashSessionToken(t) === hashSessionToken(t), "only a SHA-256 of the token is kept");
}

// The message.
{
  const m = loginCodeMessage("123456", 5);
  assert(m.subject.includes("123456") && m.text.includes("5 minit") && m.html.includes("123456"), "the message carries the code and the lifetime");
  assert(m.text.includes("Jangan kongsikan") && m.html.includes("Jangan kongsikan"), "the message warns not to share the code");
  assert(m.html.startsWith("<!doctype html>") && m.html.includes("jalin-wordmark-email.png") && !/<script|<link|@import|javascript:/i.test(m.html), "the HTML has the logo as a PNG and no script, stylesheet link or import");
  assert(m.html.includes("Kod anda: 123456") && (m.html.match(/123456/g) ?? []).length === 3, "the code appears in the title, the hidden preview line and the code box", (m.html.match(/123456/g) ?? []).length);
  assert(throws(() => loginCodeMessage("12345", 5)) && throws(() => loginCodeMessage("<b>1234", 5)) && throws(() => loginCodeMessage("1234567", 5)), "anything but six digits is refused, so no markup can reach the e-mail");
}

// Mailer choice.
{
  assert(selectMailer({}).name === "console" && selectMailer({ MAIL_PROVIDER: "console" }).name === "console", "console is the default for local work");
  assert(throws(() => selectMailer({ MAIL_PROVIDER: "console", VERCEL: "1" })) && throws(() => selectMailer({ VERCEL_ENV: "production" })), "console is refused on the live site");
  assert(throws(() => selectMailer({ MAIL_PROVIDER: "resend" })) && throws(() => selectMailer({ MAIL_PROVIDER: "resend", RESEND_API_KEY: "re_x" })), "resend needs a key and a sender");
  assert(throws(() => selectMailer({ MAIL_PROVIDER: "smtp" })), "an unknown provider is refused");
  assert(selectMailer({ MAIL_PROVIDER: "resend", RESEND_API_KEY: "re_x", MAIL_FROM: "Jalin <a@b.my>" }).name === "resend", "resend is chosen with a key and a sender");
}

// The Resend call (no network: a fake fetch records it).
async function resendCall() {
  let seenUrl = ""; let seenInit: RequestInit | undefined;
  const ok = (async (url: string, init?: RequestInit) => { seenUrl = url; seenInit = init; return new Response("{}", { status: 200 }); }) as unknown as typeof fetch;
  await resendMailer("re_secret", "Jalin <a@b.my>", ok).sendLoginCode({ to: "x@y.my", code: "654321", ttlMinutes: 5 });
  const headers = seenInit?.headers as Record<string, string>;
  const body = JSON.parse(String(seenInit?.body));
  assert(seenUrl === "https://api.resend.com/emails" && headers.Authorization === "Bearer re_secret", "Resend is called at its address with the key as a bearer token");
  assert(body.from === "Jalin <a@b.my>" && body.to[0] === "x@y.my" && String(body.text).includes("654321"), "the message goes from the sender to the reader with the code");
  const refused = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;
  let failedLoud = false;
  try { await resendMailer("k", "f", refused).sendLoginCode({ to: "x@y.my", code: "1", ttlMinutes: 5 }); } catch (e) { failedLoud = !String(e).includes("k"); }
  assert(failedLoud, "a refusal by the provider is an error that does not echo the key");
}

// Request helpers.
{
  const req = (headers: Record<string, string>) => new Request("https://jalin.adjung.com/api/akaun/kod", { method: "POST", headers });
  assert(isSameOrigin(req({ origin: "https://jalin.adjung.com", host: "jalin.adjung.com" })), "a request from this site is accepted");
  assert(!isSameOrigin(req({ origin: "https://evil.example", host: "jalin.adjung.com" })), "a request from another site is refused");
  assert(!isSameOrigin(req({ host: "jalin.adjung.com" })), "a request without an Origin is refused");
  assert(!isSameOrigin(req({ origin: "null", host: "jalin.adjung.com" })) && !isSameOrigin(req({ origin: "https://jalin.adjung.com.evil.example", host: "jalin.adjung.com" })), "a null origin and a look-alike are refused");
  assert(clientIp(req({ "x-real-ip": "203.0.113.4", "x-forwarded-for": "9.9.9.9" })) === "203.0.113.4" && clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })) === "1.2.3.4" && clientIp(req({})) === "unknown", "the visitor's address is read from the proxy headers");
  const name = readerCookieName();
  assert(readerTokenFrom(req({ cookie: `a=1; ${name}=tok_en; b=2` })) === "tok_en" && readerTokenFrom(req({ cookie: "a=1" })) === null && readerTokenFrom(req({})) === null, "the reader cookie is found among others");
  assert(readerCookieName({ NODE_ENV: "production" }) === "__Host-jalin-reader" && readerCookieName({ NODE_ENV: "development" }) === "jalin-reader", "the cookie is __Host- on the live site");
  assert(!readerAccountsEnabled({}) && !readerAccountsEnabled({ READER_ACCOUNTS_ENABLED: "true" }) && readerAccountsEnabled({ READER_ACCOUNTS_ENABLED: "yes" }), "the feature is off unless the switch says yes");
}

void resendCall().then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
});
