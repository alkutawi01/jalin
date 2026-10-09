/**
 * Small pure pieces of reader sign-in: e-mail normalising, keyed hashes, the one-time code, session tokens and the mailer choice.
 * No database here. See docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md sections 5.2 and 20.
 */
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * The address as the account is keyed: trimmed, lower case, Unicode-normalised. Dots and +tags are NOT removed (two different
 * people can own a.b@ and ab@), so the address a reader types is the address we use.
 */
export function normaliseEmail(input: string): string | null {
  const value = input.normalize("NFKC").trim().toLowerCase();
  if (value.length < 6 || value.length > 254) return null;
  // One @, a local part without spaces or further @, a domain with at least one dot and no empty label.
  const match = /^([^\s@]{1,64})@([^\s@]+)$/.exec(value);
  if (!match) return null;
  const domain = match[2];
  if (!domain.includes(".") || domain.split(".").some((label) => label.length === 0 || label.length > 63)) return null;
  if (/[^\p{L}\p{N}.\-]/u.test(domain) || domain.split(".").some((label) => label.startsWith("-") || label.endsWith("-"))) return null;
  return value;
}

export type MacKey = { keyId: string; key: Buffer };

/** The secret is 64 hex characters (256 bits). It lives in the environment of the running site, never in the repository. */
export function loadMacKey(env: Record<string, string | undefined> = process.env): MacKey {
  const keyId = env.READER_MAC_KEY_ID?.trim();
  const hex = env.READER_MAC_KEY?.trim();
  if (!keyId) throw new Error("READER_MAC_KEY_ID is not set.");
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("READER_MAC_KEY must be 64 hex characters (256 bits).");
  return { keyId, key: Buffer.from(hex, "hex") };
}

function mac(key: MacKey, label: string, value: string): string {
  return createHmac("sha256", key.key).update(`jalin-reader-v1:${label}:${value}`).digest("hex");
}

/** To find a sign-in challenge, count its requests and keep the one-trial-per-address record without keeping the address. */
export const emailLookupMac = (key: MacKey, normalisedEmail: string) => mac(key, "email", normalisedEmail);
export const trialClaimMac = (key: MacKey, normalisedEmail: string) => mac(key, "trial", normalisedEmail);
/** The visitor's network address, only ever as a keyed hash. */
export const ipMac = (key: MacKey, ip: string) => mac(key, "ip", ip.trim().toLowerCase());
/** The code, bound to the challenge it belongs to, so a code cannot be moved to another challenge. */
export const otpMac = (key: MacKey, challengeId: string, code: string) => mac(key, "otp", `${challengeId}:${code}`);

export function constantTimeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Six digits, uniformly random. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The code as typed: digits only (spaces and hyphens are ignored), exactly six. */
export function normaliseOtpInput(input: string): string | null {
  const digits = input.replace(/[\s\-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** A random session token for the cookie; only its SHA-256 is stored. The token is high-entropy, so a plain hash is enough. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type Mailer = {
  name: string;
  sendLoginCode(input: { to: string; code: string; ttlMinutes: number }): Promise<void>;
};

export function loginCodeMessage(code: string, ttlMinutes: number): { subject: string; text: string; html: string } {
  const subject = `Kod log masuk Jalin: ${code}`;
  const text = `Kod log masuk anda ialah ${code}.\n\nKod ini sah selama ${ttlMinutes} minit dan hanya boleh digunakan sekali. Jika bukan anda yang meminta, abaikan emel ini.\n\nJalin`;
  const html = `<p>Kod log masuk anda ialah:</p><p style="font-size:28px;letter-spacing:4px;font-family:monospace"><strong>${code}</strong></p><p>Kod ini sah selama ${ttlMinutes} minit dan hanya boleh digunakan sekali. Jika bukan anda yang meminta, abaikan emel ini.</p><p>Jalin</p>`;
  return { subject, text, html };
}

/** Prints the code in the server log. For local work only; production refuses it (see selectMailer). */
export function consoleMailer(log: (line: string) => void = console.log): Mailer {
  return {
    name: "console",
    async sendLoginCode({ to, code, ttlMinutes }) {
      log(`[mail:console] Kod log masuk untuk ${to}: ${code} (sah ${ttlMinutes} minit)`);
    },
  };
}

export function resendMailer(apiKey: string, from: string, fetchImpl: typeof fetch = fetch): Mailer {
  return {
    name: "resend",
    async sendLoginCode({ to, code, ttlMinutes }) {
      const message = loginCodeMessage(code, ttlMinutes);
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject: message.subject, text: message.text, html: message.html }),
      });
      if (!response.ok) throw new Error(`Mail provider refused the message (${response.status}).`);
    },
  };
}

/** MAIL_PROVIDER=resend needs RESEND_API_KEY and MAIL_FROM. The console mailer is refused on the live site: a code nobody receives is worse than an error. */
export function selectMailer(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): Mailer {
  const provider = (env.MAIL_PROVIDER ?? "console").trim();
  if (provider === "console") {
    if (env.VERCEL_ENV === "production" || env.VERCEL === "1") throw new Error("MAIL_PROVIDER=console is not allowed on the live site.");
    return consoleMailer();
  }
  if (provider === "resend") {
    const apiKey = env.RESEND_API_KEY?.trim();
    const from = env.MAIL_FROM?.trim();
    if (!apiKey || !from) throw new Error("MAIL_PROVIDER=resend needs RESEND_API_KEY and MAIL_FROM.");
    return resendMailer(apiKey, from, fetchImpl);
  }
  throw new Error(`Unknown MAIL_PROVIDER: ${provider}`);
}
