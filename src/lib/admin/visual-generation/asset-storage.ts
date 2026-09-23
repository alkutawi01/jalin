/**
 * Asset storage boundary.
 *
 * Separates provider result (potentially expiring URL) from stable Jalin asset.
 *
 * Magnific result → durable storage adapter → stable Jalin asset reference.
 *
 * Durability rules (Phase 4D-5R):
 * - Local development: public/assets/visuals/ is acceptable (finalized=true).
 * - Vercel/serverless runtime: local FS is ephemeral — NEVER mark finalized=true
 *   from local FS writes when VERCEL=1.
 * - Production durable path: S3-compatible OBJECT_STORAGE_* when configured.
 * - If durable storage fails: finalized=false, provider URL kept for provenance
 *   only, attachment blocked.
 */

export interface AssetStorageResult {
  /** Stable asset path/URL usable by Jalin (public asset path). */
  stableAssetPath: string | null;
  /** True if the asset has been persisted to durable storage. */
  finalized: boolean;
  /** Original provider URL (may expire). Kept for provenance only. */
  providerAssetUrl: string;
  /** Storage backend used: object_storage | local_fs | none */
  backend: "object_storage" | "local_fs" | "none";
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

export function objectStorageConfigured(): boolean {
  return !!(
    process.env.OBJECT_STORAGE_ENDPOINT?.trim() &&
    process.env.OBJECT_STORAGE_BUCKET?.trim() &&
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim() &&
    process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim()
  );
}

function extFromMime(mimeType: string): string {
  const ext = mimeType.split("/")[1] || "png";
  return ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
}

function publicObjectKey(visualRequestId: number, ext: string): string {
  return `assets/visuals/vr-${visualRequestId}.${ext}`;
}

function publicLocalPath(visualRequestId: number, ext: string): string {
  return `/assets/visuals/vr-${visualRequestId}.${ext}`;
}

function objectPublicUrl(key: string): string {
  const endpoint = (process.env.OBJECT_STORAGE_ENDPOINT || "").replace(/\/$/, "");
  const bucket = process.env.OBJECT_STORAGE_BUCKET || "";
  // Path-style URL works for most S3-compatible providers (R2, MinIO, Spaces).
  return `${endpoint}/${bucket}/${key}`;
}

/** Minimal AWS SigV4 signer for S3-compatible PutObject (no SDK dependency). */
async function putObjectStorage(
  body: Buffer,
  key: string,
  contentType: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const endpointRaw = process.env.OBJECT_STORAGE_ENDPOINT?.trim();
  const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!endpointRaw || !bucket || !accessKeyId || !secretAccessKey) {
    return { ok: false, error: "Object storage not configured." };
  }

  try {
    const crypto = await import("node:crypto");
    const endpoint = new URL(endpointRaw);
    const region =
      process.env.OBJECT_STORAGE_REGION?.trim() ||
      (endpoint.hostname.includes("amazonaws.")
        ? endpoint.hostname.split(".")[1] || "us-east-1"
        : "us-east-1");
    const service = "s3";
    const host = endpoint.host;
    const canonicalUri = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const algorithm = "AWS4-HMAC-SHA256";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = crypto.createHash("sha256").update(body).digest("hex");

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "content-type": contentType,
    };

    const signedHeaderKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
    const canonicalHeaders = signedHeaderKeys
      .map((k) => `${k}:${String(headers[k] ?? headers[k.toLowerCase()]).trim()}\n`)
      .join("");
    const signedHeaders = signedHeaderKeys.join(";");

    const canonicalRequest = [
      "PUT",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const hmac = (key: Buffer | string, data: string): Buffer =>
      crypto.createHmac("sha256", key).update(data).digest();
    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service),
      "aws4_request"
    );
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `${endpoint.origin}${canonicalUri}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        Authorization: authorization,
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: `Object storage PUT ${response.status}: ${text.substring(0, 200)}` };
    }

    return { ok: true, url: objectPublicUrl(key) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Object storage upload failed.",
    };
  }
}

/**
 * Attempt to persist a provider asset to durable storage.
 *
 * Returns finalized=true only when persistence is durable for the runtime:
 * - object storage upload success → durable
 * - local FS write outside Vercel → durable for development
 * - local FS write on Vercel → NOT durable → finalized=false
 */
export async function storeVisualAsset(
  providerAssetUrl: string,
  visualRequestId: number,
  mimeType: string = "image/png"
): Promise<AssetStorageResult> {
  if (!providerAssetUrl) {
    return { stableAssetPath: null, finalized: false, providerAssetUrl, backend: "none" };
  }

  try {
    const response = await fetch(providerAssetUrl, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return { stableAssetPath: null, finalized: false, providerAssetUrl, backend: "none" };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = extFromMime(mimeType);

    // Preferred durable path: object storage
    if (objectStorageConfigured()) {
      const key = publicObjectKey(visualRequestId, ext);
      const put = await putObjectStorage(buffer, key, mimeType);
      if (put.ok && put.url) {
        return {
          stableAssetPath: publicLocalPath(visualRequestId, ext),
          finalized: true,
          providerAssetUrl,
          backend: "object_storage",
        };
      }
      // Object storage failed — do not fall back to ephemeral FS on Vercel.
      if (isVercelRuntime()) {
        return { stableAssetPath: null, finalized: false, providerAssetUrl, backend: "none" };
      }
    }

    // Vercel runtime without working object storage: local FS is ephemeral.
    if (isVercelRuntime()) {
      return { stableAssetPath: null, finalized: false, providerAssetUrl, backend: "none" };
    }

    // Local development filesystem (not durable in production, OK in dev).
    const fs = await import("fs/promises");
    const path = await import("path");
    const publicDir = path.join(process.cwd(), "public", "assets", "visuals");
    await fs.mkdir(publicDir, { recursive: true });
    const filePath = path.join(publicDir, `vr-${visualRequestId}.${ext}`);
    await fs.writeFile(filePath, buffer);

    return {
      stableAssetPath: publicLocalPath(visualRequestId, ext),
      finalized: true,
      providerAssetUrl,
      backend: "local_fs",
    };
  } catch {
    return { stableAssetPath: null, finalized: false, providerAssetUrl, backend: "none" };
  }
}
