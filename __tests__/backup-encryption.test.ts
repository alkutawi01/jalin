import { strict as assert } from "node:assert";
import { createHash, createHmac } from "node:crypto";
import { decryptBackup, encryptBackup, loadBackupEncKey } from "../src/lib/reader-auth/backup-crypto";
import { parseCodesExport } from "../src/lib/reader-auth/codes-export";
import { freshExport } from "../src/lib/reader-auth/maintenance";
import type { Db } from "../src/lib/reader-auth/service";

const key = Buffer.alloc(32, 7);
const codeKey = { keyId: "test", key: Buffer.alloc(32, 8) };
const body = JSON.stringify({ t: "meta", v: 1, at: "2026-10-10T00:00:00.000Z", halted: false });
const digest = createHash("sha256").update(body).digest("hex");
const sig = createHmac("sha256", codeKey.key).update(`jalin-export-v1:${digest}`).digest("hex");
const plaintext = `${body}\n${JSON.stringify({ t: "end", lines: 1, digest, sig })}\n`;
const file = encryptBackup(plaintext, key);

assert(!file.includes("meta") && !file.includes("jalin-export"), "stored file is ciphertext");
assert.equal(decryptBackup(file, key), plaintext, "AES-GCM round trip");
assert.equal(parseCodesExport(file, codeKey, { backupKey: key }).at.toISOString(), "2026-10-10T00:00:00.000Z");
assert.throws(() => parseCodesExport(plaintext, codeKey), /manual/, "legacy plaintext is not accepted by default");
assert.equal(parseCodesExport(plaintext, codeKey, { allowLegacyPlaintext: true }).codes.length, 0, "legacy plaintext is available for manual recovery");

const envelope = JSON.parse(file.slice("JALIN-BACKUP-ENC:".length)) as { data: string };
envelope.data = (envelope.data[0] === "A" ? "B" : "A") + envelope.data.slice(1);
assert.throws(() => parseCodesExport("JALIN-BACKUP-ENC:" + JSON.stringify(envelope), codeKey, { backupKey: key }), /AES-GCM/, "tampered ciphertext is rejected");
assert.throws(() => decryptBackup(file, Buffer.alloc(32, 9)), /AES-GCM/, "wrong key is rejected");
assert.equal(loadBackupEncKey({ BACKUP_ENC_KEY: "ab".repeat(32) }).length, 32);
assert.throws(() => loadBackupEncKey({}), /BACKUP_ENC_KEY/);
assert.throws(() => loadBackupEncKey({ BACKUP_ENC_KEY: "ab".repeat(32), CODE_MAC_KEY: "ab".repeat(32) }), /berbeza/);

const saved = process.env.BACKUP_ENC_KEY;
delete process.env.BACKUP_ENC_KEY;
void (async () => {
  try {
    await assert.rejects(() => freshExport({} as Db), /BACKUP_ENC_KEY/, "missing key prevents an admin download before any plaintext is built");
  } finally {
    if (saved === undefined) delete process.env.BACKUP_ENC_KEY;
    else process.env.BACKUP_ENC_KEY = saved;
  }
  console.log("backup encryption tests passed");
})();
