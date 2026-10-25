/**
 * The plain code of a paid order has to wait somewhere until the e-mail has been sent (and be there for a second try if the e-mail
 * fails), but the database keeps only keyed hashes of codes. So it waits ENCRYPTED: AES-256-GCM with a key derived (HKDF) from the code
 * key, never the code key itself, and bound to the order reference, so a copy moved to another order does not open. Erased once sent.
 * Pure functions, no database.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const INFO = "jalin-order-code-v1";

function derive(key: Buffer | string): Buffer {
  const material = typeof key === "string" ? Buffer.from(key, "utf8") : key;
  if (material.length < 32) throw new Error("The code key must be at least 256 bits.");
  return Buffer.from(hkdfSync("sha256", material, Buffer.alloc(0), INFO, 32));
}

const b64 = (buffer: Buffer) => buffer.toString("base64url");

export function encryptOrderCode(key: Buffer | string, orderReference: string, canonicalCode: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derive(key), iv);
  cipher.setAAD(Buffer.from(orderReference, "utf8"));
  const body = Buffer.concat([cipher.update(canonicalCode, "utf8"), cipher.final()]);
  return ["v1", b64(iv), b64(cipher.getAuthTag()), b64(body)].join(".");
}

/** Throws if the text was changed, or belongs to another order, or the key is not the one it was made with. */
export function decryptOrderCode(key: Buffer | string, orderReference: string, blob: string): string {
  const [version, iv, tag, body] = blob.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unknown order code format.");
  const decipher = createDecipheriv("aes-256-gcm", derive(key), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(orderReference, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
