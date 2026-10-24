import { createHash, createHmac } from "node:crypto";

/**
 * S3-compatible object store (Cloudflare R2), signed with AWS SigV4 and no SDK. The bucket is private: the public reads files
 * through /media/[...key] (see src/app/media), never straight from the bucket.
 */

export interface ObjectStoreConfig {
  endpoint: URL;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export function objectStoreConfig(env: NodeJS.ProcessEnv = process.env): ObjectStoreConfig | null {
  const endpointRaw = env.OBJECT_STORAGE_ENDPOINT?.trim();
  const bucket = env.OBJECT_STORAGE_BUCKET?.trim();
  const accessKeyId = env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();
  if (!endpointRaw || !bucket || !accessKeyId || !secretAccessKey) return null;
  try {
    const endpoint = new URL(endpointRaw);
    if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") return null;
    return { endpoint, bucket, accessKeyId, secretAccessKey, region: env.OBJECT_STORAGE_REGION?.trim() || "auto" };
  } catch {
    return null;
  }
}

/** Where the public reads a stored file: this site's own /media route. */
export function mediaPublicUrl(key: string, env: NodeJS.ProcessEnv = process.env): string {
  const base = (env.MEDIA_PUBLIC_BASE?.trim() || `${(env.NEXT_PUBLIC_APP_URL?.trim() || "https://jalin.adjung.com").replace(/\/$/, "")}/media`).replace(/\/$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();
const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

async function signedFetch(
  cfg: ObjectStoreConfig,
  method: "GET" | "PUT" | "HEAD" | "DELETE" | "POST",
  key: string,
  options: { query?: Record<string, string>; body?: Buffer | string; contentType?: string; timeoutMs?: number } = {}
): Promise<Response> {
  const body = options.body === undefined ? Buffer.alloc(0) : Buffer.from(options.body);
  const canonicalUri = `/${cfg.bucket}${key ? `/${encodeKey(key)}` : ""}`;
  const query = Object.entries(options.query ?? {}).sort(([a], [b]) => (a < b ? -1 : 1));
  const canonicalQuery = query.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const headers: Record<string, string> = { host: cfg.endpoint.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
  if (options.contentType) headers["content-type"] = options.contentType;
  const signedKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedKeys.map((k) => `${k}:${headers[k].trim()}\n`).join("");
  const signedHeaders = signedKeys.join(";");
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${cfg.secretAccessKey}`, dateStamp), cfg.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `${cfg.endpoint.origin}${canonicalUri}${canonicalQuery ? `?${canonicalQuery}` : ""}`;
  return fetch(url, {
    method,
    headers: { ...headers, Authorization: authorization },
    body: method === "PUT" || method === "POST" ? new Uint8Array(body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  });
}

export async function putObject(cfg: ObjectStoreConfig, key: string, body: Buffer | string, contentType: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await signedFetch(cfg, "PUT", key, { body, contentType });
    if (res.ok) return { ok: true };
    return { ok: false, error: `PUT ${res.status}: ${(await res.text().catch(() => "")).slice(0, 160)}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "PUT failed." };
  }
}

/** The file as a response (for streaming to a reader), or null when it does not exist. */
export async function getObject(cfg: ObjectStoreConfig, key: string): Promise<Response | null> {
  const res = await signedFetch(cfg, "GET", key);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${res.status}`);
  return res;
}

export async function headObject(cfg: ObjectStoreConfig, key: string): Promise<{ size: number; contentType: string } | null> {
  const res = await signedFetch(cfg, "HEAD", key);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HEAD ${res.status}`);
  return { size: Number(res.headers.get("content-length") ?? 0), contentType: res.headers.get("content-type") ?? "" };
}

export async function deleteObject(cfg: ObjectStoreConfig, key: string): Promise<void> {
  const res = await signedFetch(cfg, "DELETE", key);
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${res.status}`);
}

/** Keys under a prefix with their upload time (newest first is the caller's job). */
export async function listObjects(cfg: ObjectStoreConfig, prefix: string): Promise<{ key: string; lastModified: Date }[]> {
  const out: { key: string; lastModified: Date }[] = [];
  let token = "";
  for (let page = 0; page < 20; page++) {
    const query: Record<string, string> = { "list-type": "2", prefix };
    if (token) query["continuation-token"] = token;
    const res = await signedFetch(cfg, "GET", "", { query });
    if (!res.ok) throw new Error(`LIST ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = m[1].match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      const when = m[1].match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
      if (key) out.push({ key: key.replace(/&amp;/g, "&"), lastModified: when ? new Date(when) : new Date(0) });
    }
    const next = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
    if (!next || !/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
    token = next.replace(/&amp;/g, "&");
  }
  return out;
}
