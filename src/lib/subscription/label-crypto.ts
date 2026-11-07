/** Separate HKDF purpose from orders/backups; serial-bound ciphertext. No secrets in error messages. */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { channelOfSerial, normaliseCodeInput } from "./redeem-code";

const INFO = "jalin-physical-label-v1";
const failure = () => new Error("Physical label recovery failed.");
function derive(key: Buffer): Buffer {
  if (key.length < 32) throw failure();
  return Buffer.from(hkdfSync("sha256", key, Buffer.alloc(0), INFO, 32));
}
const b64 = (value: Buffer) => value.toString("base64url");
const isCanonical = (value: string) => {
  const parsed = normaliseCodeInput(value);
  return parsed.ok && parsed.canonical === value;
};

export function encryptLabelCode(key: Buffer, serial: string, canonical: string): string {
  if (channelOfSerial(serial) !== "physical" || !isCanonical(canonical)) throw failure();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derive(key), iv);
  cipher.setAAD(Buffer.from(serial, "utf8"));
  const body = Buffer.concat([cipher.update(canonical, "utf8"), cipher.final()]);
  return ["v1", b64(iv), b64(cipher.getAuthTag()), b64(body)].join(".");
}

export function decryptLabelCode(key: Buffer, serial: string, sealed: string): string {
  try {
    if (channelOfSerial(serial) !== "physical" || !/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{23}$/.test(sealed)) throw failure();
    const [, iv, tag, body] = sealed.split(".");
    const decipher = createDecipheriv("aes-256-gcm", derive(key), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(serial, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const canonical = Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
    if (!isCanonical(canonical)) throw failure();
    return canonical;
  } catch { throw failure(); }
}
