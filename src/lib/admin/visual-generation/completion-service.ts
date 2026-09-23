/**
 * Unified visual generation completion service.
 *
 * BOTH execution modes converge here:
 * - magnific_api (poll / in-request completion)
 * - magnific_connector (authenticated ChatGPT completion endpoint)
 * - Magnific webhook callbacks
 *
 * Invariants:
 * - Generation ≠ Approval ≠ Attachment ≠ Publication
 * - Completes to under_review + approval_state=pending ONLY
 * - Never approves, never attaches, never publishes
 * - Idempotent on repeated completion for the same task
 * - Stable asset required before attachment (enforced in attach, not here)
 */

import type { Kysely } from "kysely";
import type { Database, VisualRequestStatus, ApprovalState } from "../../db/types";
import type { VisualExecutionMode, VisualErrorCategory } from "./adapter";
import { classifyVisualError, sanitizeVisualErrorMessage } from "./adapter";
import { storeVisualAsset } from "./asset-storage";

export interface CompleteVisualGenerationInput {
  visualRequestId: number;
  /** Must be magnific for real provider completions. */
  provider?: string;
  executionMode: VisualExecutionMode;
  providerTaskId?: string | null;
  providerCreationId?: string | null;
  providerAssetUrl: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  /** Webhook delivery id for dedup (webhook path only). */
  webhookId?: string | null;
  /** Source of completion for attempt history. */
  source?: "poll" | "webhook" | "connector" | "inline";
}

export interface CompleteVisualGenerationResult {
  success: boolean;
  idempotent?: boolean;
  requestId: number;
  status?: VisualRequestStatus;
  approvalState?: ApprovalState;
  assetFinalized?: boolean;
  stableAssetPath?: string | null;
  error?: string;
  errorCategory?: string;
}

interface AttemptLike {
  at?: string;
  mode?: string;
  taskId?: string | null;
  webhookId?: string;
  status?: string;
  errorCategory?: string;
}

export function parseAttemptHistory(raw: unknown): AttemptLike[] {
  if (Array.isArray(raw)) return raw as AttemptLike[];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AttemptLike[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function serializeAttempts(attempts: AttemptLike[]): string {
  return JSON.stringify(attempts);
}

/**
 * Fail a visual generation with a sanitized classified error.
 * Used by webhook failure callbacks and API failures.
 */
export async function failVisualGeneration(
  db: Kysely<Database>,
  input: {
    visualRequestId: number;
    error: unknown;
    executionMode?: VisualExecutionMode;
    providerTaskId?: string | null;
    webhookId?: string | null;
  }
): Promise<CompleteVisualGenerationResult> {
  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", input.visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return {
      success: false,
      requestId: input.visualRequestId,
      error: "Visual request tidak ditemui.",
    };
  }

  // Terminal editorial states must not be clobbered by late failure callbacks.
  if (["approved", "attached", "rejected"].includes(vr.status)) {
    return {
      success: false,
      idempotent: true,
      requestId: vr.id,
      status: vr.status,
      approvalState: vr.approval_state,
      error: "Status editorial terminal — kegagalan lewat diabaikan.",
    };
  }

  const errorCategory: VisualErrorCategory = classifyVisualError(input.error);
  const errorMessage = sanitizeVisualErrorMessage(input.error);
  const attempts = parseAttemptHistory(vr.attempt_history);
  attempts.push({
    at: new Date().toISOString(),
    mode: input.executionMode ?? "magnific_api",
    taskId: input.providerTaskId ?? vr.provider_request_id,
    webhookId: input.webhookId ?? undefined,
    status: "failed",
    errorCategory,
  });

  await db
    .updateTable("visual_requests")
    .set({
      status: "failed" as VisualRequestStatus,
      error_category: errorCategory as never,
      error_message: errorMessage,
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      retry_count: (vr.retry_count ?? 0) + 1,
      attempt_history: serializeAttempts(attempts) as never,
      execution_mode: (input.executionMode ?? vr.execution_mode ?? "magnific_api") as never,
      provider_request_id: input.providerTaskId ?? vr.provider_request_id,
    })
    .where("id", "=", input.visualRequestId)
    .execute();

  return {
    success: true,
    requestId: vr.id,
    status: "failed",
    approvalState: vr.approval_state,
    errorCategory,
    error: errorMessage,
  };
}

/**
 * Canonical completion path for all Magnific execution modes.
 *
 * Validates state → records provenance → copies provider asset to durable
 * storage → writes dimensions/mime → completed_at → under_review
 * (approval_state remains pending).
 */
export async function completeVisualGeneration(
  db: Kysely<Database>,
  input: CompleteVisualGenerationInput
): Promise<CompleteVisualGenerationResult> {
  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", input.visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return {
      success: false,
      requestId: input.visualRequestId,
      error: "Visual request tidak ditemui.",
    };
  }

  // Reject wrong provider if explicitly provided.
  if (input.provider && vr.provider && input.provider !== vr.provider) {
    return {
      success: false,
      requestId: vr.id,
      error: "Provider tidak sepadan dengan visual request.",
      errorCategory: "validation_error",
    };
  }

  // Provider must remain magnific for real generations (mock allowed for tests).
  if (vr.provider !== "magnific" && vr.provider !== "mock") {
    return {
      success: false,
      requestId: vr.id,
      error: "Provider tidak dibenarkan.",
      errorCategory: "validation_error",
    };
  }

  // Wrong state for completion.
  if (["approved", "attached", "rejected", "draft"].includes(vr.status)) {
    return {
      success: false,
      requestId: vr.id,
      status: vr.status,
      approvalState: vr.approval_state,
      error: `Status '${vr.status}' tidak boleh menerima completion.`,
      errorCategory: "validation_error",
    };
  }

  // Idempotent: already completed for this task (or any under_review completion).
  const taskId = input.providerTaskId ?? null;
  const sameTask = taskId && vr.provider_request_id === taskId;
  if (vr.status === "under_review" && (sameTask || !taskId)) {
    return {
      success: true,
      idempotent: true,
      requestId: vr.id,
      status: vr.status,
      approvalState: vr.approval_state,
      assetFinalized: vr.asset_finalized,
      stableAssetPath: vr.source_asset_path,
    };
  }

  if (vr.status === "generated" && sameTask) {
    return {
      success: true,
      idempotent: true,
      requestId: vr.id,
      status: vr.status,
      approvalState: vr.approval_state,
      assetFinalized: vr.asset_finalized,
      stableAssetPath: vr.source_asset_path,
    };
  }

  if (!input.providerAssetUrl) {
    return {
      success: false,
      requestId: vr.id,
      error: "providerAssetUrl diperlukan.",
      errorCategory: "validation_error",
    };
  }

  if (!["queued", "generating", "generated", "failed", "under_review"].includes(vr.status)) {
    return {
      success: false,
      requestId: vr.id,
      status: vr.status,
      error: `Status '${vr.status}' tidak sah untuk completion.`,
      errorCategory: "validation_error",
    };
  }

  const attempts = parseAttemptHistory(vr.attempt_history);
  // Immutable storage version: never reuse a prior object key on regenerate.
  const storageVersion = (vr.retry_count ?? 0) + attempts.length + 1;

  try {
    const storage = await storeVisualAsset(
      input.providerAssetUrl,
      vr.id,
      input.mimeType ?? "image/png",
      { version: storageVersion }
    );

    attempts.push({
      at: new Date().toISOString(),
      mode: input.source === "webhook" ? "webhook" : input.executionMode,
      taskId: taskId ?? vr.provider_request_id,
      webhookId: input.webhookId ?? undefined,
      status: storage.finalized ? "completed" : "completed_unfinalized",
    });

    await db
      .updateTable("visual_requests")
      .set({
        status: "under_review" as VisualRequestStatus,
        approval_state: "pending" as ApprovalState,
        provider: vr.provider === "mock" ? "mock" : "magnific",
        execution_mode: input.executionMode as never,
        provider_request_id: taskId ?? vr.provider_request_id,
        provider_creation_id: input.providerCreationId ?? vr.provider_creation_id,
        source_asset_url: input.providerAssetUrl,
        source_asset_path: storage.stableAssetPath,
        asset_width: input.width ?? vr.asset_width,
        asset_height: input.height ?? vr.asset_height,
        asset_mime_type: input.mimeType ?? vr.asset_mime_type ?? "image/png",
        asset_finalized: storage.finalized,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_category: null,
        error_message: null,
        failed_at: null,
        attempt_history: serializeAttempts(attempts) as never,
        last_webhook_id: input.webhookId ?? vr.last_webhook_id,
      })
      .where("id", "=", vr.id)
      .execute();

    return {
      success: true,
      idempotent: false,
      requestId: vr.id,
      status: "under_review",
      approvalState: "pending",
      assetFinalized: storage.finalized,
      stableAssetPath: storage.stableAssetPath,
    };
  } catch (error) {
    return failVisualGeneration(db, {
      visualRequestId: vr.id,
      error,
      executionMode: input.executionMode,
      providerTaskId: taskId,
      webhookId: input.webhookId,
    });
  }
}
