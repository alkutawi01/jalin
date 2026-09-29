/**
 * Manual visual upload: image type detection and early validation
 * (these paths return before touching the database).
 */

import { applyManualUpload, detectImageType, MAX_MANUAL_UPLOAD_BYTES } from "../src/lib/admin/visual-generation/manual-upload";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

async function main() {
  console.log("manual visual upload tests\n");

  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56]);
  const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

  assert(detectImageType(png)?.mime === "image/png", "detects PNG by magic bytes");
  assert(detectImageType(jpeg)?.ext === "jpg", "detects JPEG by magic bytes");
  assert(detectImageType(webp)?.mime === "image/webp", "detects WebP by magic bytes");
  assert(detectImageType(html) === null, "HTML renamed as an image is rejected");
  assert(detectImageType(svg) === null, "SVG is rejected (can carry scripts)");
  assert(detectImageType(new Uint8Array(0)) === null, "empty input is rejected");

  const noDb = null as never;
  const empty = await applyManualUpload(noDb, 1, Buffer.alloc(0), null, "test");
  assert(!empty.ok && empty.status === 400, "empty file -> 400");
  const notImage = await applyManualUpload(noDb, 1, Buffer.from(html), null, "test");
  assert(!notImage.ok && notImage.status === 415, "non-image file -> 415");
  const huge = await applyManualUpload(noDb, 1, Buffer.alloc(MAX_MANUAL_UPLOAD_BYTES + 1, 1), null, "test");
  assert(!huge.ok && huge.status === 413, "oversized file -> 413");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
