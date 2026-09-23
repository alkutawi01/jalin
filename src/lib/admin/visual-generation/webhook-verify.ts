/**
 * Magnific webhook signature verification (HMAC-SHA256).
 *
 * Official spec (docs.magnific.com/webhooks):
 * - Headers: webhook-id, webhook-timestamp, webhook-signature
 * - Content to sign: `${webhookId}.${webhookTimestamp}.${rawBody}`
 * - Signature: base64(HMAC-SHA256(secret, content))
 * - Header value: space-delimited list of `version,signature` pairs
 *   (e.g. "v1,abc v2,def") for secret rotation.
 *
 * Fail closed. Constant-time comparison. Never log the secret.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookSignatureHeaders {
  webhookId?: string | null;
  webhookTimestamp?: string | null;
  webhookSignature?: string | null;
}

export type WebhookVerifyResult =
  | { ok: true; webhookId: string; webhookTimestamp: string }
  | {
      ok: false;
      reason:
        | "missing_secret"
        | "missing_headers"
        | "missing_signature"
        | "malformed_signature"
        | "bad_timestamp"
        | "signature_mismatch"
        | "replay_detected";
    };

/** Max allowed clock skew for webhook timestamps (seconds). */
export const WEBHOOK_MAX_TOLERANCE_SECONDS = 300;

export function extractWebhookHeaders(
  getHeader: (name: string) => string | null | undefined
): WebhookSignatureHeaders {
  return {
    webhookId: getHeader("webhook-id") ?? getHeader("x-webhook-id") ?? null,
    webhookTimestamp:
      getHeader("webhook-timestamp") ?? getHeader("x-webhook-timestamp") ?? null,
    webhookSignature:
      getHeader("webhook-signature") ?? getHeader("x-webhook-signature") ?? null,
  };
}

export function signWebhookContent(
  secret: string,
  webhookId: string,
  webhookTimestamp: string,
  rawBody: string
): string {
  const content = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  return createHmac("sha256", secret).update(content, "utf8").digest("base64");
}

function safeEqualBase64(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still perform a comparison to reduce timing signal on length.
    const pad = Buffer.alloc(Math.max(bufA.length, bufB.length));
    const padA = Buffer.concat([bufA, pad]).subarray(0, pad.length);
    const padB = Buffer.concat([bufB, pad]).subarray(0, pad.length);
    timingSafeEqual(padA, padB);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function verifyWebhookSignature(
  headers: WebhookSignatureHeaders,
  rawBody: string,
  secret: string | undefined,
  options: { now?: number; maxToleranceSeconds?: number } = {}
): WebhookVerifyResult {
  if (!secret || !secret.trim()) {
    return { ok: false, reason: "missing_secret" };
  }

  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!webhookId || !webhookTimestamp) {
    return { ok: false, reason: "missing_headers" };
  }
  if (!webhookSignature || !webhookSignature.trim()) {
    return { ok: false, reason: "missing_signature" };
  }

  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const ts = Number(webhookTimestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "bad_timestamp" };
  }
  const maxTolerance = options.maxToleranceSeconds ?? WEBHOOK_MAX_TOLERANCE_SECONDS;
  if (Math.abs(nowSeconds - ts) > maxTolerance) {
    return { ok: false, reason: "replay_detected" };
  }

  const expected = signWebhookContent(secret, webhookId, webhookTimestamp, rawBody);

  // Signature header may be a bare signature or "v1,sig v2,sig".
  const candidates = webhookSignature
    .trim()
    .split(/\s+/)
    .map((part) => {
      const idx = part.indexOf(",");
      return idx >= 0 ? part.slice(idx + 1) : part;
    })
    .filter(Boolean);

  if (candidates.length === 0) {
    return { ok: false, reason: "malformed_signature" };
  }

  let matched = false;
  for (const candidate of candidates) {
    if (safeEqualBase64(expected, candidate)) {
      matched = true;
    }
  }

  if (!matched) {
    return { ok: false, reason: "signature_mismatch" };
  }

  return { ok: true, webhookId, webhookTimestamp };
}
