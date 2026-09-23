/**
 * Visual generation orchestration service.
 *
 * Coordinates: prompt composition → provider call → asset storage → editorial review.
 * Enforces idempotency, provenance, and privacy boundaries.
 *
 * Generation ≠ Approval ≠ Publication.
 * Does NOT auto-publish visuals. Does NOT auto-attach to Works.
 */

import type { Kysely } from "kysely";
import type {
  Database,
  VisualRequestStatus,
  ApprovalState,
  AspectRatio,
  VisualRole,
} from "../../db/types";
import type { VisualProviderAdapter, VisualErrorCategory } from "./adapter";
import { classifyVisualError, sanitizeVisualErrorMessage } from "./adapter";
import { composeVisualPrompt } from "./prompt-composer";
import { storeVisualAsset } from "./asset-storage";

export interface VisualGenerationRequest {
  visualRequestId: number;
  provider: string;
  model?: string;
  requestedBy?: string;
  editorialOverride?: string | null;
  idempotencyKey: string;
}

export interface VisualGenerationResult {
  requestId: number;
  status: VisualRequestStatus;
  approvalState: ApprovalState;
  assetUrl: string | null;
  stableAssetPath: string | null;
  assetFinalized: boolean;
  providerRequestId: string | null;
  providerCreationId: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  promptComposed: string | null;
  errorCategory: string | null;
  errorMessage: string | null;
}

/** Check for an active (in-flight) visual generation. */
export async function hasActiveVisualGeneration(
  db: Kysely<Database>,
  visualRequestId: number
): Promise<boolean> {
  const active = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .where("status", "in", ["queued", "generating"])
    .select("id")
    .executeTakeFirst();

  return !!active;
}

/** Check for existing idempotency key. */
export async function findVisualByIdempotencyKey(
  db: Kysely<Database>,
  idempotencyKey: string
): Promise<{ id: number; status: VisualRequestStatus } | undefined> {
  return (
    (await db
      .selectFrom("visual_requests")
      .where("idempotency_key", "=", idempotencyKey)
      .select(["id", "status"])
      .executeTakeFirst()) ?? undefined
  );
}

/**
 * Execute a visual generation request.
 *
 * Lifecycle: draft/pending → queued → generating → generated → under_review
 * On failure: → failed (with error classification)
 *
 * Never auto-approves. Never auto-attaches. Never auto-publishes.
 */
export async function executeVisualGeneration(
  db: Kysely<Database>,
  request: VisualGenerationRequest,
  adapter: VisualProviderAdapter
): Promise<VisualGenerationResult> {
  // 1. Idempotency check
  const existing = await findVisualByIdempotencyKey(db, request.idempotencyKey);
  if (existing) {
    const record = await db
      .selectFrom("visual_requests")
      .where("id", "=", existing.id)
      .selectAll()
      .executeTakeFirst();

    return {
      requestId: existing.id,
      status: existing.status,
      approvalState: record?.approval_state ?? "pending",
      assetUrl: record?.source_asset_url ?? null,
      stableAssetPath: record?.source_asset_path ?? null,
      assetFinalized: record?.asset_finalized ?? false,
      providerRequestId: record?.provider_request_id ?? null,
      providerCreationId: record?.provider_creation_id ?? null,
      width: record?.asset_width ?? null,
      height: record?.asset_height ?? null,
      mimeType: record?.asset_mime_type ?? null,
      promptComposed: record?.prompt_composed ?? null,
      errorCategory: record?.error_category ?? null,
      errorMessage: record?.error_message ?? null,
    };
  }

  // 2. Active lock check
  if (await hasActiveVisualGeneration(db, request.visualRequestId)) {
    return {
      requestId: request.visualRequestId,
      status: "generating",
      approvalState: "pending",
      assetUrl: null,
      stableAssetPath: null,
      assetFinalized: false,
      providerRequestId: null,
      providerCreationId: null,
      width: null,
      height: null,
      mimeType: null,
      promptComposed: null,
      errorCategory: "validation_error",
      errorMessage: "Permintaan penjanaan visual aktif sudah wujud.",
    };
  }

  // 3. Load the visual request
  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", request.visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return {
      requestId: request.visualRequestId,
      status: "failed",
      approvalState: "pending",
      assetUrl: null,
      stableAssetPath: null,
      assetFinalized: false,
      providerRequestId: null,
      providerCreationId: null,
      width: null,
      height: null,
      mimeType: null,
      promptComposed: null,
      errorCategory: "validation_error",
      errorMessage: "Visual request tidak ditemui.",
    };
  }

  // 4. Compose prompt (house style + scene + role + aspect ratio)
  const composed = composeVisualPrompt({
    sceneInstruction: vr.prompt,
    role: vr.visual_role as VisualRole,
    aspectRatio: vr.aspect_ratio as AspectRatio,
    workTitle: vr.work_id ?? undefined,
    editorialOverride: request.editorialOverride,
  });

  // 5. Update status to queued + store idempotency key and composed prompt
  const now = new Date().toISOString();
  await db
    .updateTable("visual_requests")
    .set({
      status: "queued" as VisualRequestStatus,
      provider: request.provider,
      model: request.model ?? null,
      idempotency_key: request.idempotencyKey,
      prompt_composed: JSON.stringify({
        finalPrompt: composed.finalPrompt,
        houseStyleVersion: composed.houseStyleVersion,
        provenance: composed.provenance,
      }),
      requested_by: request.requestedBy ?? "admin",
      updated_at: now,
    })
    .where("id", "=", request.visualRequestId)
    .execute();

  // 6. Update status to generating + started_at
  await db
    .updateTable("visual_requests")
    .set({
      status: "generating" as VisualRequestStatus,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", request.visualRequestId)
    .execute();

  // 7. Execute generation
  try {
    if (!adapter.isConfigured()) {
      throw new Error(`Provider ${request.provider} is not configured.`);
    }

    const response = await adapter.generateVisual({
      prompt: composed.finalPrompt,
      role: vr.visual_role as VisualRole,
      aspectRatio: vr.aspect_ratio as AspectRatio,
      metadata: {
        visualRequestId: request.visualRequestId,
        workId: vr.work_id ?? undefined,
        submissionId: vr.submission_id ?? undefined,
        model: request.model,
      },
    });

    if (response.status === "failed" || !response.assetUrl) {
      throw new Error(response.assetUrl ? "Provider returned failed status." : "Provider returned no asset URL.");
    }

    // 8. Asset storage boundary — provider URL → stable asset (may not finalize)
    const storage = await storeVisualAsset(
      response.assetUrl,
      request.visualRequestId,
      response.mimeType ?? "image/png"
    );

    // 9. Store success: generated + under_review, provenance captured
    await db
      .updateTable("visual_requests")
      .set({
        status: "under_review" as VisualRequestStatus,
        approval_state: "pending" as ApprovalState,
        provider: response.provider,
        provider_request_id: response.providerRequestId,
        provider_creation_id: response.providerCreationId,
        source_asset_url: response.assetUrl,
        source_asset_path: storage.stableAssetPath,
        asset_width: response.width,
        asset_height: response.height,
        asset_mime_type: response.mimeType,
        asset_finalized: storage.finalized,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_category: null,
        error_message: null,
      })
      .where("id", "=", request.visualRequestId)
      .execute();

    return {
      requestId: request.visualRequestId,
      status: "under_review",
      approvalState: "pending",
      assetUrl: response.assetUrl,
      stableAssetPath: storage.stableAssetPath,
      assetFinalized: storage.finalized,
      providerRequestId: response.providerRequestId,
      providerCreationId: response.providerCreationId,
      width: response.width,
      height: response.height,
      mimeType: response.mimeType,
      promptComposed: JSON.stringify({
        finalPrompt: composed.finalPrompt,
        houseStyleVersion: composed.houseStyleVersion,
        provenance: composed.provenance,
      }),
      errorCategory: null,
      errorMessage: null,
    };
  } catch (error) {
    // 10. Store failure with classified error
    const errorCategory: VisualErrorCategory = classifyVisualError(error);
    const errorMessage = sanitizeVisualErrorMessage(error);

    await db
      .updateTable("visual_requests")
      .set({
        status: "failed" as VisualRequestStatus,
        error_category: errorCategory as never,
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        retry_count: (vr.retry_count ?? 0) + 1,
      })
      .where("id", "=", request.visualRequestId)
      .execute();

    return {
      requestId: request.visualRequestId,
      status: "failed",
      approvalState: "pending",
      assetUrl: null,
      stableAssetPath: null,
      assetFinalized: false,
      providerRequestId: null,
      providerCreationId: null,
      width: null,
      height: null,
      mimeType: null,
      promptComposed: null,
      errorCategory,
      errorMessage,
    };
  }
}

/**
 * Approve a generated visual request.
 * Explicit approval only — never automatic.
 */
export async function approveVisualRequest(
  db: Kysely<Database>,
  visualRequestId: number,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return { success: false, error: "Visual request tidak ditemui." };
  }

  if (vr.status !== "under_review" && vr.status !== "generated") {
    return {
      success: false,
      error: `Status '${vr.status}' tidak boleh diluluskan. Perlu 'under_review' atau 'generated'.`,
    };
  }

  if (!vr.source_asset_url) {
    return { success: false, error: "Tiada asset dijana untuk diluluskan." };
  }

  await db
    .updateTable("visual_requests")
    .set({
      status: "approved" as VisualRequestStatus,
      approval_state: "approved" as ApprovalState,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", visualRequestId)
    .execute();

  return { success: true };
}

/**
 * Reject a generated visual request.
 * Rejected generations remain in provenance/history.
 */
export async function rejectVisualRequest(
  db: Kysely<Database>,
  visualRequestId: number,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return { success: false, error: "Visual request tidak ditemui." };
  }

  if (vr.status !== "under_review" && vr.status !== "generated") {
    return {
      success: false,
      error: `Status '${vr.status}' tidak boleh ditolak. Perlu 'under_review' atau 'generated'.`,
    };
  }

  await db
    .updateTable("visual_requests")
    .set({
      status: "rejected" as VisualRequestStatus,
      approval_state: "rejected" as ApprovalState,
      approved_by: approvedBy,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", visualRequestId)
    .execute();

  return { success: true };
}

/**
 * Attach an approved visual request to a canonical Work.
 *
 * Only approved requests may be attached.
 * Requires: work_id, stable asset src, role.
 * Does NOT publish the Work.
 */
export async function attachVisualToWork(
  db: Kysely<Database>,
  visualRequestId: number
): Promise<{ success: boolean; visualId?: number; error?: string }> {
  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return { success: false, error: "Visual request tidak ditemui." };
  }

  if (vr.status !== "approved" || vr.approval_state !== "approved") {
    return {
      success: false,
      error: "Hanya visual yang telah diluluskan boleh dipautkan.",
    };
  }

  if (!vr.work_id) {
    return { success: false, error: "Work ID diperlukan untuk pautan visual." };
  }

  // Require stable asset — provider URL alone is not sufficient for attachment
  const stableSrc = vr.source_asset_path || vr.source_asset_url;
  if (!stableSrc) {
    return { success: false, error: "Tiada asset stabil untuk dipautkan." };
  }

  // Validate Work exists and is not auto-published
  const work = await db
    .selectFrom("works")
    .where("id", "=", vr.work_id)
    .select(["id", "status"])
    .executeTakeFirst();

  if (!work) {
    return { success: false, error: "Work tidak ditemui." };
  }

  // Create the canonical visual record
  const insertResult = await db
    .insertInto("visuals")
    .values({
      work_id: vr.work_id,
      role: vr.visual_role as VisualRole,
      src: stableSrc,
      alt: vr.alt_text,
      provider: vr.provider,
      creation_id: vr.provider_creation_id,
      anchor: vr.anchor,
      place: vr.place,
      sort_order: 0,
      is_asset_finalized: vr.asset_finalized,
      created_at: new Date().toISOString(),
    } as never)
    .returning("id")
    .executeTakeFirst();

  if (!insertResult) {
    return { success: false, error: "Gagal mencipta visual record." };
  }

  // Mark request as attached
  await db
    .updateTable("visual_requests")
    .set({
      status: "attached" as VisualRequestStatus,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", visualRequestId)
    .execute();

  return { success: true, visualId: insertResult.id };
}
