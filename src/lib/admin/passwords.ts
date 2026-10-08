/**
 * Passwords for staff accounts: hashed with scrypt (built into Node, no package), compared in constant time.
 * Stored form: "scrypt$<N>$<saltHex>$<hashHex>". A temporary password is shown once to the owner (to paste into an invitation)
 * and never stored in the clear.
 */
import crypto from "node:crypto";

const N = 16384;
const KEYLEN = 64;
// No 0/O, 1/l/I: a temporary password is typed from a message, so it must be unambiguous.
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MIN_PASSWORD_LENGTH = 10;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  if (!Number.isInteger(n) || n < 1024 || n > 1 << 20) return false;
  try {
    const expected = Buffer.from(parts[3]!, "hex");
    const actual = crypto.scryptSync(password, Buffer.from(parts[2]!, "hex"), expected.length, { N: n });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** 12 characters, in three groups of four ("Kp4t-Xm9w-Rb2n"), easy to read aloud and to paste. */
export function generateTempPassword(): string {
  const pick = () => TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)]!;
  return Array.from({ length: 3 }, () => Array.from({ length: 4 }, pick).join("")).join("-");
}

/** An error message in Malay, or null when the new password is acceptable. */
export function passwordProblem(password: unknown, username?: string): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) return `Kata laluan terlalu pendek: sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`;
  if (password.length > 200) return "Kata laluan terlalu panjang.";
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "Kata laluan tidak boleh mengandungi nama pengguna.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Kata laluan mesti ada huruf dan nombor.";
  return null;
}
