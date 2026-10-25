/**
 * Redeem code primitives (study: docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md, section 5.6 and 16.1). Pure functions only: no
 * database, no environment, nothing wired to a page. The code body is 16 random Crockford base32 characters (80 bits) plus one
 * check character. The check character catches typing mistakes; it is not a security control. A code is only valid together with
 * the serial number of its card, which is bound into the stored MAC.
 */
import { createHmac, randomBytes } from "node:crypto";
import { addMonthsMYT } from "./periods";

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

/**
 * The serial number of one card, printed in the open on its label: JLN-12B0126-F01.
 *   JLN   Jalin
 *   12B   the length of the subscription (01B, 06B or 12B: 1, 6 or 12 months)
 *   0126  month and year the code is expected to be issued (MMYY)
 *   F     the kind of card: F for a physical card, M for a virtual one (a code sent by e-mail)
 *   01    the card's own number among cards of the same length, month and kind
 * The reader types it together with the code, so a code alone is not enough: it is the second factor (Izzat, 24 Oct 2026; F and M, 25 Oct 2026).
 */
export type CodeChannel = "physical" | "virtual";
const CHANNEL_LETTER: Record<CodeChannel, "F" | "M"> = { physical: "F", virtual: "M" };
export const SERIAL_PATTERN = /^JLN-(01|06|12)B(0[1-9]|1[0-2])(\d{2})-([FM])(\d{2,5})$/;

const MMYY = /^(0[1-9]|1[0-2])\d{2}$/;

/** The part every card of one length, month and kind shares: JLN-12B0126-F. The card's own number follows it directly. */
export function serialPrefix(months: 1 | 6 | 12, mmyy: string, channel: CodeChannel = "physical"): string {
  if (![1, 6, 12].includes(months)) throw new Error("A card is for 1, 6 or 12 months.");
  if (!MMYY.test(mmyy)) throw new Error("Invalid issue month.");
  return `JLN-${String(months).padStart(2, "0")}B${mmyy}-${CHANNEL_LETTER[channel]}`;
}

/** The card's own number, at least two digits wide, after the prefix. */
export function formatSerial(prefix: string, n: number, minWidth = 2): string {
  return `${prefix}${String(n).padStart(minWidth, "0")}`;
}

/** The part before the card's own number: JLN-12B0126-F01 gives JLN-12B0126-F. */
export function serialGroup(serial: string): string {
  return serial.replace(/\d+$/, "");
}

/** Which kind of card a serial is: F is physical, M is virtual. */
export function channelOfSerial(serial: string): CodeChannel | null {
  const m = SERIAL_PATTERN.exec(serial.toUpperCase());
  return m ? (m[4] === "F" ? "physical" : "virtual") : null;
}

/** Typed input: ignore case, spaces and underscores, and read the long dashes some keyboards and phones put in as hyphens. */
export function normaliseSerial(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s_]/g, "").replace(/[\u2010-\u2015\u2212]/g, "-");
  return SERIAL_PATTERN.test(cleaned) ? cleaned : null;
}

/** MMYY of a moment, in Malaysian time (the month the editor means). */
export function mmyyFor(date: Date): string {
  const my = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${String(my.getUTCMonth() + 1).padStart(2, "0")}${String(my.getUTCFullYear()).slice(2)}`;
}

/** The month input of the admin gives 2026-10; the serial wants 1026. */
export function mmyyFromMonthInput(value: string): string | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value.trim());
  return m ? `${m[2]}${m[1].slice(2)}` : null;
}

// ------------------------------------------------------------------ the last day a code can be redeemed ("TEBUS SEBELUM")

const MYT_MS = 8 * 60 * 60 * 1000;
const MONTH_LABELS = ["JAN", "FEB", "MAC", "APR", "MEI", "JUN", "JUL", "OGO", "SEP", "OKT", "NOV", "DIS"];

/** The stored value for a last valid day: the start of the NEXT day, Malaysian time. The code works on the whole of the last day. */
function startOfNextDayMYT(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day + 1) - MYT_MS);
}

/** "2027-12-31" (the admin's date input) becomes the stored moment, or null if it is not a real date. */
export function redeemByFromDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return startOfNextDayMYT(y, mo, d);
}

/** The last day a code works, as the date input wants it (2027-12-31). */
export function redeemByLastDayInput(redeemBy: Date): string {
  const wall = new Date(redeemBy.getTime() - 1 + MYT_MS);
  return `${wall.getUTCFullYear()}-${String(wall.getUTCMonth() + 1).padStart(2, "0")}-${String(wall.getUTCDate()).padStart(2, "0")}`;
}

/** The last day a code works, as printed on a label: 31 DIS 2027. */
export function redeemByLabel(redeemBy: Date): string {
  const wall = new Date(redeemBy.getTime() - 1 + MYT_MS);
  return `${wall.getUTCDate()} ${MONTH_LABELS[wall.getUTCMonth()]} ${wall.getUTCFullYear()}`;
}

/** A virtual code is good for one year after it is made: the same calendar day next year is the last day (29 Feb falls back to 28 Feb). */
export function virtualRedeemBy(generatedAt: Date): Date {
  const last = addMonthsMYT(generatedAt, 12);
  const wall = new Date(last.getTime() + MYT_MS);
  return startOfNextDayMYT(wall.getUTCFullYear(), wall.getUTCMonth() + 1, wall.getUTCDate());
}

/**
 * The only thing stored for a code. The input is length-prefixed so a serial and a code can never run together into another pair:
 * HMAC-SHA256(key, "JALIN-V2" + length + ":" + serial + ":" + code). The key never lives in the repository. The code is valid only
 * together with the serial of its own card.
 */
export function computeCodeMac(key: Buffer | string, serial: string, canonicalCode: string): string {
  const keyBuffer = typeof key === "string" ? Buffer.from(key, "utf8") : key;
  if (keyBuffer.length < 32) throw new Error("The code MAC key must be at least 256 bits.");
  const normalisedSerial = normaliseSerial(serial);
  if (!normalisedSerial) throw new Error("Invalid serial number.");
  return createHmac("sha256", keyBuffer).update(`JALIN-V2:${normalisedSerial.length}:${normalisedSerial}:${canonicalCode}`).digest("hex");
}
