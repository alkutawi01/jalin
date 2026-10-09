/**
 * Redeem code primitives (study: docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md, section 5.6 and 16.1). Pure functions only: no
 * database, no environment, nothing wired to a page. The code body is 16 random Crockford base32 characters (80 bits) plus one
 * check character. The check character catches typing mistakes; it is not a security control. A code is only valid together with
 * its batch number, which is bound into the stored MAC.
 */
import { createHmac, randomBytes } from "node:crypto";

/** Crockford base32: no I, L, O or U. */
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_BODY_LENGTH = 16;

const INDEX = new Map<string, number>([...CODE_ALPHABET].map((c, i) => [c, i]));

/** GF(2^5) with x^5 + x^2 + 1. */
function gfMultiply(a: number, b: number): number {
  let result = 0;
  let x = a;
  let y = b;
  while (y) {
    if (y & 1) result ^= x;
    y >>= 1;
    x <<= 1;
    if (x & 0b100000) x ^= 0b100101;
  }
  return result;
}

const ALPHA = 2;

/**
 * Damm-style check over GF(32): interim = ALPHA * interim XOR symbol. The quasigroup (a, b) -> ALPHA*a XOR b is a Latin square
 * and weakly totally anti-symmetric for any ALPHA other than 0 and 1, so every single-character error and every swap of two
 * adjacent characters changes the final value. The test file verifies this exhaustively; it is not assumed.
 */
function interimOf(symbols: readonly number[]): number {
  let interim = 0;
  for (const s of symbols) interim = gfMultiply(ALPHA, interim) ^ s;
  return interim;
}

function symbolsOf(text: string): number[] | null {
  const out: number[] = [];
  for (const ch of text) {
    const value = INDEX.get(ch);
    if (value === undefined) return null;
    out.push(value);
  }
  return out;
}

/** The check character for a body (`interim` of body, then one more step must reach 0). */
export function checkCharacterFor(body: string): string {
  const symbols = symbolsOf(body);
  if (!symbols) throw new Error("Code body has a character outside the alphabet.");
  const interim = interimOf(symbols);
  // Appending c gives ALPHA*interim XOR c = 0, so c = ALPHA*interim.
  return CODE_ALPHABET[gfMultiply(ALPHA, interim)];
}

/** Uniformly random body: 256 is a multiple of 32, so masking a random byte has no bias. */
export function generateCodeBody(length = CODE_BODY_LENGTH): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] & 31];
  return out;
}

/** Body plus check character, no separators: the form the MAC is computed from. */
export function generateCanonicalCode(): string {
  const body = generateCodeBody();
  return body + checkCharacterFor(body);
}

/** Display form XXXX-XXXX-XXXX-XXXX-C. */
export function formatCode(canonical: string): string {
  const body = canonical.slice(0, CODE_BODY_LENGTH).match(/.{1,4}/g)!.join("-");
  return `${body}-${canonical.slice(CODE_BODY_LENGTH)}`;
}

export type NormalisedCode = { ok: true; canonical: string } | { ok: false; reason: "empty" | "length" | "alphabet" | "check" };

/**
 * Typed input: ignore case, spaces and hyphens; read O as 0 and I or L as 1 (the characters Crockford leaves out).
 * Returns the canonical code only when the length, the alphabet and the check character are all right.
 */
export function normaliseCodeInput(input: string): NormalisedCode {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (!cleaned) return { ok: false, reason: "empty" };
  if (cleaned.length !== CODE_BODY_LENGTH + 1) return { ok: false, reason: "length" };
  const symbols = symbolsOf(cleaned);
  if (!symbols) return { ok: false, reason: "alphabet" };
  if (interimOf(symbols) !== 0) return { ok: false, reason: "check" };
  return { ok: true, canonical: cleaned };
}

/** Batch numbers are printed on the card in the open: capital letters, digits and hyphens. */
export function normaliseBatch(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9][A-Z0-9-]{1,23}[A-Z0-9]$/.test(cleaned) ? cleaned : null;
}

/**
 * The only thing stored for a code. The input is length-prefixed so a batch and a code can never run together into another
 * pair: HMAC-SHA256(key, "JALIN-V1" + length + ":" + batch + ":" + code). The key never lives in the repository.
 */
export function computeCodeMac(key: Buffer | string, batch: string, canonicalCode: string): string {
  const keyBuffer = typeof key === "string" ? Buffer.from(key, "utf8") : key;
  if (keyBuffer.length < 32) throw new Error("The code MAC key must be at least 256 bits.");
  const normalisedBatch = normaliseBatch(batch);
  if (!normalisedBatch) throw new Error("Invalid batch number.");
  return createHmac("sha256", keyBuffer).update(`JALIN-V1:${normalisedBatch.length}:${normalisedBatch}:${canonicalCode}`).digest("hex");
}
