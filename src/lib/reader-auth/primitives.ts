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

/** The key for redeem codes is a different secret from the sign-in key, so a leak of one does not open the other. */
export function loadCodeKey(env: Record<string, string | undefined> = process.env): MacKey {
  const keyId = env.CODE_MAC_KEY_ID?.trim();
  const hex = env.CODE_MAC_KEY?.trim();
  if (!keyId) throw new Error("CODE_MAC_KEY_ID is not set.");
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("CODE_MAC_KEY must be 64 hex characters (256 bits).");
  if (env.READER_MAC_KEY && env.READER_MAC_KEY.trim().toLowerCase() === hex.toLowerCase()) throw new Error("CODE_MAC_KEY must differ from READER_MAC_KEY.");
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
  // Six digits only, so nothing below needs escaping; refuse anything else rather than put it into markup.
  if (!/^\d{6}$/.test(code)) throw new Error("The sign-in code must be six digits.");
  const subject = `Kod log masuk Jalin: ${code}`;
  const text = `Kod log masuk anda ialah ${code}.\n\nKod ini sah selama ${ttlMinutes} minit dan hanya boleh digunakan sekali. Jangan kongsikan kod ini dengan sesiapa. Jika anda tidak meminta kod ini, abaikan e-mel ini. Tiada tindakan lanjut diperlukan.\n\nJalin, oleh Adjung Press`;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = "Arial,Helvetica,sans-serif";
  const html = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fbf8f2">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#fbf8f2">Kod anda: ${code}. Sah ${ttlMinutes} minit.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f2"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#fffefa;border:1px solid #ddd7cc;border-radius:12px">
<tr><td align="center" style="padding:32px 24px 8px"><img src="${EMAIL_LOGO_URL}" width="96" alt="Jalin" style="display:block;border:0;height:auto;width:96px"></td></tr>
<tr><td align="center" style="padding:20px 32px 4px;font-family:${serif};font-size:22px;line-height:1.3;color:#18343c">Kod log masuk anda</td></tr>
<tr><td align="center" style="padding:0 32px 20px;font-family:${sans};font-size:14px;line-height:1.6;color:#52656a">Masukkan kod ini pada halaman Jalin untuk log masuk atau mendaftar.</td></tr>
<tr><td align="center" style="padding:0 32px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#f7ece4;border-radius:10px"><tr><td align="center" style="padding:16px 28px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:#18343c">${code}</td></tr></table></td></tr>
<tr><td align="center" style="padding:20px 32px 8px;font-family:${sans};font-size:14px;line-height:1.6;color:#18343c">Kod ini sah selama <strong>${ttlMinutes} minit</strong> dan hanya boleh digunakan sekali.</td></tr>
<tr><td align="center" style="padding:0 32px 28px;font-family:${sans};font-size:13px;line-height:1.6;color:#52656a">Jangan kongsikan kod ini dengan sesiapa. Jika anda tidak meminta kod ini, abaikan e-mel ini. Tiada tindakan lanjut diperlukan.</td></tr>
<tr><td align="center" style="padding:16px 24px;border-top:1px solid #ddd7cc;font-family:${sans};font-size:12px;color:#52656a">Jalin, oleh Adjung Press<br>Selami dunia melalui cerita</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/** The logo is hosted on the live site: an e-mail client cannot reach localhost, and most do not draw SVG, so this is a PNG. */
export const EMAIL_LOGO_URL = "https://jalin.adjung.com/brand/jalin-wordmark-email.png";

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
