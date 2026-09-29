/**
 * Manual visual upload.
 *
 * An editor may supply an image made outside Magnific (editor decision
 * 2026-09-29: the Magnific-only gate is removed). The upload only STORES
 * the image and moves the request to `under_review`; a human must still
 * approve it and attach it, and provenance is recorded honestly as
 * provider "manual" (plus the tool the editor names).
 */

import type { Kysely } from "kysely";
import type { Database } from "../../db/types";
import { storeVisualAssetBytes } from "./asset-storage";

export const MAX_MANUAL_UPLOAD_BYTES = 10 * 1024 * 1024;

export type ManualImageType = { mime: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" };

/** Detect the real image type from magic bytes (never trust the client's mime/extension). */
export function detectImageType(bytes: Uint8Array): ManualImageType | null {
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

const REPLACEABLE_STATUSES = new Set(["draft", "failed", "generated", "under_review", "rejected"]);

export type ManualUploadResult =
  | { ok: true; assetPath: string; backend: string }
  | { ok: false; status: number; error: string };

export async function applyManualUpload(
  db: Kysely<Database>,
  visualRequestId: number,
  bytes: Buffer,
  toolName: string | null,
  actor: string
): Promise<ManualUploadResult> {
  if (bytes.length === 0) return { ok: false, status: 400, error: "Fail kosong." };
  if (bytes.length > MAX_MANUAL_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: "Fail melebihi 10 MB." };
  }
  const type = detectImageType(bytes);
  if (!type) {
    return { ok: false, status: 415, error: "Hanya imej PNG, JPEG atau WebP diterima." };
  }

  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .selectAll()
    .executeTakeFirst();
  if (!vr) return { ok: false, status: 404, error: "Visual request tidak ditemui." };
  if (!REPLACEABLE_STATUSES.has(vr.status)) {
    return {
      ok: false,
      status: 409,
      error: `Status '${vr.status}' tidak boleh ditukar imejnya. Imej yang telah diluluskan atau dipautkan tidak boleh diganti senyap-senyap.`
    };
  }

  const stored = await storeVisualAssetBytes(bytes, visualRequestId, type.mime, {
    version: (vr.retry_count ?? 0) + 1
  });
  if (!stored.finalized || !stored.stableAssetPath) {
    return {
      ok: false,
      status: 503,
      error: "Storan imej tahan lama tidak tersedia (OBJECT_STORAGE_* belum dikonfigurasi pada persekitaran ini). Imej tidak disimpan."
    };
  }

  let history: unknown[] = [];
  try {
    const parsed = vr.attempt_history ? JSON.parse(vr.attempt_history) : [];
    if (Array.isArray(parsed)) history = parsed;
  } catch {
    history = [];
  }
  const crypto = await import("node:crypto");
  history.push({
    at: new Date().toISOString(),
    event: "manual_upload",
    by: actor,
    tool: toolName,
    bytes: bytes.length,
    mime: type.mime,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  });

  const now = new Date().toISOString();
  await db
    .updateTable("visual_requests")
    .set({
      provider: "manual",
      model: toolName,
      provider_request_id: null,
      provider_creation_id: null,
      source_asset_url: stored.stableAssetPath,
      source_asset_path: stored.stableAssetPath,
      asset_finalized: true,
      asset_mime_type: type.mime,
      status: "under_review",
      approval_state: "pending",
      approved_by: null,
      approved_at: null,
      attempt_history: JSON.stringify(history),
      completed_at: now,
      updated_at: now
    })
    .where("id", "=", visualRequestId)
    .execute();

  return { ok: true, assetPath: stored.stableAssetPath, backend: stored.backend };
}
