import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = 1;
const PREFIX = "JALIN-BACKUP-ENC:";

export function loadBackupEncKey(env: Record<string, string | undefined> = process.env): Buffer {
  const hex = env.BACKUP_ENC_KEY?.trim();
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("BACKUP_ENC_KEY belum ditetapkan atau tidak sah.");
  if ([env.READER_MAC_KEY, env.CODE_MAC_KEY].some((other) => other?.trim().toLowerCase() === hex.toLowerCase())) {
    throw new Error("BACKUP_ENC_KEY mesti berbeza daripada kunci MAC.");
  }
  return Buffer.from(hex, "hex");
}

export function isEncryptedBackup(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptBackup(plaintext: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Kunci eksport mesti 32 bait.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + JSON.stringify({ v: VERSION, nonce: nonce.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), data: ciphertext.toString("base64url") });
}

export function decryptBackup(value: string, key: Buffer): string {
  if (key.length !== 32 || !isEncryptedBackup(value)) throw new Error("Format atau kunci eksport tidak sah.");
  try {
    const envelope = JSON.parse(value.slice(PREFIX.length)) as Record<string, unknown>;
    if (envelope.v !== VERSION || typeof envelope.nonce !== "string" || typeof envelope.tag !== "string" || typeof envelope.data !== "string") throw new Error("envelope");
    const nonce = Buffer.from(envelope.nonce, "base64url");
    const tag = Buffer.from(envelope.tag, "base64url");
    if (nonce.length !== 12 || tag.length !== 16) throw new Error("length");
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Fail eksport rosak atau pengesahan AES-GCM gagal.");
  }
}
