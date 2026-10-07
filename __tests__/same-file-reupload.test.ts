/**
 * Izzat: "kenapa saya tak boleh gantikan gambar bersiri? keluar notis: imej tidak dapat disimpan secara kekal."
 * A stored picture's key holds a hash of the file and is never overwritten, so uploading the very same file again was refused by
 * the store ("already exists") and shown as a storage failure. The same file is already stored: its address is the answer.
 */
import fs from "node:fs";
import path from "node:path";
import { buildImmutableObjectKey } from "../src/lib/admin/visual-generation/asset-storage";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const source = fs.readFileSync(path.join(__dirname, "..", "src/lib/admin/visual-generation/asset-storage.ts"), "utf8").replace(/\r\n/g, "\n");

assert(buildImmutableObjectKey(5000123, "png", 1, "abcdef0123456789") === buildImmutableObjectKey(5000123, "png", 1, "abcdef0123456789"), "the same file for the same series has the same key");
assert(buildImmutableObjectKey(5000123, "png", 1, "abcdef0123456789") !== buildImmutableObjectKey(5000123, "png", 1, "1234567890abcdef"), "a different file has another key");
const put = source.slice(source.indexOf("async function putVercelBlob"), source.indexOf("/** Any durable store"));
assert(put.includes("allowOverwrite: false"), "a stored picture is still never overwritten");
const fallback = put.slice(put.indexOf("} catch (error) {"));
assert(fallback.includes('const { head } = await import("@vercel/blob");') && fallback.includes("await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN })"), "a refused upload looks for the file under its key");
assert(fallback.includes("existing.size === body.length") && fallback.includes("return { ok: true, url: existing.url };"), "and answers with its address only when it is the same size");
assert(fallback.trimEnd().endsWith('return { ok: false, error: error instanceof Error ? error.message : "Vercel Blob upload failed." };\n  }\n}'.trimEnd()) || fallback.includes('return { ok: false, error: error instanceof Error ? error.message : "Vercel Blob upload failed." };'), "any other failure is still a failure");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
