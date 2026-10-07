/**
 * The upload forms said "maksimum 10 MB", but the host refuses any request above 4.5 MB before it reaches Jalin, with a plain-text
 * "Request Entity Too Large": a 5.5 MB picture failed with "Gagal memuat naik…" and no reason. The limit is now 4 MB, said on
 * the forms and checked in the browser before anything is sent.
 */
import fs from "node:fs";
import path from "node:path";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, uploadTooLargeMessage } from "../src/lib/admin/upload-limit";
import { MAX_MANUAL_UPLOAD_BYTES } from "../src/lib/admin/visual-generation/manual-upload";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(MAX_UPLOAD_BYTES === 4 * 1024 * 1024 && MAX_UPLOAD_BYTES < 4.5 * 1024 * 1024 && MAX_UPLOAD_LABEL === "4 MB", "the limit is under what the host accepts");
assert(MAX_MANUAL_UPLOAD_BYTES === MAX_UPLOAD_BYTES, "the server uses the same limit");
assert(uploadTooLargeMessage(MAX_UPLOAD_BYTES) === null && uploadTooLargeMessage(300_000) === null, "a file within the limit is sent");
const message = uploadTooLargeMessage(5_500_000) ?? "";
assert(message.startsWith("Fail ini 5.2 MB. Had muat naik ialah 4 MB") && message.includes("kecilkan gambar dahulu"), "a larger one is refused with its size, the limit and what to do", message);

for (const file of ["src/app/admin/series/[id]/page.tsx", "src/app/admin/visual-requests/[id]/page.tsx", "src/app/admin/works/[id]/page.tsx", "src/components/admin/ChapterImages.tsx", "src/components/admin/WorkVisualUpload.tsx"]) {
  const source = read(file);
  const check = source.indexOf("uploadTooLargeMessage(", source.indexOf("\n", source.indexOf("upload-limit")));
  const sent = source.indexOf("new FormData()", check);
  assert(check > 0 && sent > check && source.slice(check, sent).includes("if (tooLarge) throw new Error(tooLarge);"), `${file.replace("src/", "")}: checked before anything is sent`);
  assert(!source.includes("10 MB"), `${file.replace("src/", "")}: no longer promises 10 MB`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
