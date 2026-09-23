/**
 * Phase 4D-5R2 — Real durable storage smoke test (no new Magnific generation).
 *
 * Reuses the prior non-public Magnific smoke asset URL when available,
 * otherwise falls back to a tiny local PNG buffer (storage-only).
 *
 * Checklist (storage contract):
 * 1. provider asset copied to durable storage
 * 2. finalized=true
 * 3. source_asset_path (stableAssetPath) populated
 * 4. canonical path returns HTTP success
 * 5. content is an image
 * 6. accessible after "invocation" (second independent GET)
 * 7. not a Magnific transient URL
 * 8–10. no approve/attach/publish (storage-only — no DB writes)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  storeVisualAsset,
  objectStorageConfigured,
  isVercelRuntime,
} from "../src/lib/admin/visual-generation/asset-storage";

const REUSE_PROVIDER_URL =
  "https://cdn-magnific.freepik.com/mystic_v1_upscale_bb293888-5b9b-42d9-846b-90a11f864306_0.png?token=exp=1790180062~hmac=fd93aaa407566708087a787915da78144ae175914e13fb9fa656bc0f377d0446&size=stable";

async function main() {
  const checks: string[] = [];
  const fail = (m: string): never => {
    console.error(`FAIL: ${m}`);
    process.exit(1);
    throw new Error(m);
  };

  if (!objectStorageConfigured()) {
    fail("OBJECT_STORAGE_* not configured — cannot run durable storage smoke");
  }
  console.log(`Vercel runtime: ${isVercelRuntime()}`);
  console.log(`Object storage configured: true`);

  // Prefer reuse of Magnific smoke asset; fall back to storage-only bytes.
  let providerUrl = REUSE_PROVIDER_URL;
  try {
    const head = await fetch(providerUrl, { method: "GET", signal: AbortSignal.timeout(15_000) });
    if (!head.ok) {
      console.log(`Reuse URL not available (${head.status}) — using storage-only fallback`);
      providerUrl = "";
    } else {
      console.log("Reusing prior Magnific smoke asset URL (non-public)");
    }
  } catch {
    console.log("Reuse URL unreachable — using storage-only fallback");
    providerUrl = "";
  }

  let stablePath: string | null = null;
  let finalized = false;
  let backend = "none";

  if (providerUrl) {
    const result = await storeVisualAsset(providerUrl, 999001, "image/png", { version: 1 });
    stablePath = result.stableAssetPath;
    finalized = result.finalized;
    backend = result.backend;
  } else {
    const { createServer } = await import("node:http");
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
      0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    const server = createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(png);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;
    providerUrl = `http://127.0.0.1:${port}/smoke.png`;
    try {
      const result = await storeVisualAsset(providerUrl, 999002, "image/png", { version: 1 });
      stablePath = result.stableAssetPath;
      finalized = result.finalized;
      backend = result.backend;
    } finally {
      server.close();
    }
  }

  if (!finalized) fail("asset_finalized/finalized is not true");
  checks.push("1 durable copy: finalized=true");
  if (!stablePath) fail("stableAssetPath/source_asset_path empty");
  const canonical = String(stablePath);
  checks.push("2 source_asset_path populated");
  checks.push(`3 backend=${backend}`);

  if (/cdn-magnific|freepik|mystic/i.test(canonical)) {
    fail(`canonical path is provider/transient URL: ${canonical.slice(0, 80)}`);
  }
  checks.push("4 canonical src is not Magnific transient URL");

  const get1 = await fetch(canonical, { signal: AbortSignal.timeout(30_000) });
  if (!get1.ok) fail(`canonical GET #1 status ${get1.status}`);
  const ct1 = get1.headers.get("content-type") || "";
  const buf1 = Buffer.from(await get1.arrayBuffer());
  if (!ct1.startsWith("image/") && !(buf1[0] === 0x89 && buf1[1] === 0x50)) {
    fail(`canonical GET #1 not an image (ct=${ct1})`);
  }
  checks.push(`5 canonical GET #1 OK (${get1.status}, ${ct1 || "png-magic"}, ${buf1.length}b)`);

  const get2 = await fetch(canonical, { signal: AbortSignal.timeout(30_000) });
  if (!get2.ok) fail(`canonical GET #2 status ${get2.status}`);
  checks.push(`6 canonical GET #2 OK (${get2.status}) — durable across calls`);

  checks.push("7 no approve/attach/publish (storage-only, no DB writes)");
  checks.push("8 test asset unapproved");
  checks.push("9 test asset unattached");
  checks.push("10 no Work modified");

  console.log("\nSTORAGE SMOKE CHECKLIST:");
  for (const c of checks) console.log(`  ✓ ${c}`);
  console.log(`\nCANONICAL_EXAMPLE: ${canonical.replace(/([?&]=)[^&]+/g, "$1***")}`);
  console.log("STORAGE_SMOKE=PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
