/**
 * Visual generation orchestration service.
 *
 * Coordinates: prompt composition → provider submit → task tracking →
 * unified completion → editorial review.
 *
 * Generation ≠ Approval ≠ Attachment ≠ Publication.
 * Does NOT auto-publish visuals. Does NOT auto-attach to Works.
 *
 * Async Magnific lifecycle (Phase 4D-5R):
 *   draft → queued → generating (task submitted) → [poll | webhook |
 *   connector] → completeVisualGeneration → under_review (pending)
 */

import type { Kysely } from "kysely";
import type {
  Database,
  VisualRequestStatus,
  ApprovalState,
  AspectRatio,
  VisualRole,
} from "../../db/types";
import type {
  VisualProviderAdapter,
  VisualErrorCategory,
  VisualExecutionMode,
} from "./adapter";
import {
  classifyVisualError,
  sanitizeVisualErrorMessage,
  MAX_VISUAL_RETRY_COUNT,
  isRetryableVisualError,
} from "./adapter";
import { composeVisualPrompt } from "./prompt-composer";
import { completeVisualGeneration, failVisualGeneration, parseAttemptHistory } from "./completion-service";

export interface VisualGenerationRequest {
  visualRequestId: number;
  provider: string;
  model?: string;
  requestedBy?: string;
  editorialOverride?: string | null;
  idempotencyKey: string;
  executionMode?: VisualExecutionMode;
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
  executionMode: VisualExecutionMode | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  promptComposed: string | null;
  errorCategory: string | null;
  errorMessage: string | null;
  /** True when async task submitted and still awaiting completion. */
  pendingTask?: boolean;
}

/** Statuses that count as an in-flight (active) generation. */
const ACTIVE_STATUSES: VisualRequestStatus[] = ["queued", "generating"];

/** Statuses where an existing idempotency key should short-circuit. */
const IDEMPOTENT_HIT_STATUSES: VisualRequestStatus[] = [
  "queued",
  "generating",
  "under_review",
  "approved",
  "attached",
  "rejected",
];

export async function hasActiveVisualGeneration(
  db: Kysely<Database>,
  visualRequestId: number
): Promise<boolean> {
  const active = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .where("status", "in", ACTIVE_STATUSES)
    .select("id")
    .executeTakeFirst();

  return !!active;
}

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

function emptyResult(
  requestId: number,
  status: VisualRequestStatus,
  errorCategory: string | null,
  errorMessage: string | null
): VisualGenerationResult {
  return {
    requestId,
    status,
    approvalState: "pending",
    assetUrl: null,
    stableAssetPath: null,
    assetFinalized: false,
    providerRequestId: null,
    providerCreationId: null,
    executionMode: null,
    width: null,
    height: null,
    mimeType: null,
    promptComposed: null,
    errorCategory,
    errorMessage,
  };
}

function mapRecordToResult(record: {
  id: number;
  status: VisualRequestStatus;
  approval_state: ApprovalState;
  source_asset_url: string | null;
  source_asset_path: string | null;
  asset_finalized: boolean;
  provider_request_id: string | null;
  provider_creation_id: string | null;
  execution_mode: VisualExecutionMode | null;
  asset_width: number | null;
  asset_height: number | null;
  asset_mime_type: string | null;
  prompt_composed: string | null;
  error_category: string | null;
  error_message: string | null;
}): VisualGenerationResult {
  return {
    requestId: record.id,
    status: record.status,
    approvalState: record.approval_state,
    assetUrl: record.source_asset_url,
    stableAssetPath: record.source_asset_path,
    assetFinalized: record.asset_finalized,
    providerRequestId: record.provider_request_id,
    providerCreationId: record.provider_creation_id,
    executionMode: record.execution_mode,
    width: record.asset_width,
    height: record.asset_height,
    mimeType: record.asset_mime_type,
    promptComposed: record.prompt_composed,
    errorCategory: record.error_category,
    errorMessage: record.error_message,
    pendingTask: record.status === "generating" || record.status === "queued",
  };
}

/**
 * Bounded polling fallback for async Magnific tasks.
 * Stops on terminal state. Never spins indefinitely.
 */
export async function pollVisualGeneration(
  db: Kysely<Database>,
  visualRequestId: number,
  adapter: VisualProviderAdapter,
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<VisualGenerationResult> {
  // Bounded: default single pass; hard-cap prevents high-frequency loops.
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 1, 3));
  const delayMs = Math.max(0, options.delayMs ?? 0);

  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return emptyResult(visualRequestId, "failed", "validation_error", "Visual request tidak ditemui.");
  }

  if (!["queued", "generating"].includes(vr.status)) {
    return mapRecordToResult(vr);
  }

  if (!vr.provider_request_id) {
    return emptyResult(visualRequestId, vr.status, "validation_error", "Tiada provider task ID.");
  }

  if (!adapter.pollVisualTask || !adapter.isConfigured()) {
    return emptyResult(visualRequestId, vr.status, "validation_error", "Polling tidak tersedia.");
  }

  const mode = (vr.execution_mode as VisualExecutionMode) || "magnific_api";
  const attempts = parseAttemptHistory(vr.attempt_history);

  for (let i = 0; i < maxAttempts; i++) {
    if (delayMs > 0 && i > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    let poll;
    try {
      poll = await adapter.pollVisualTask(vr.provider_request_id);
    } catch (error) {
      await failVisualGeneration(db, {
        visualRequestId,
        error,
        executionMode: mode,
        providerTaskId: vr.provider_request_id,
      });
      return {
        ...emptyResult(visualRequestId, "failed", classifyVisualError(error), sanitizeVisualErrorMessage(error)),
        executionMode: mode,
        providerRequestId: vr.provider_request_id,
      };
    }

    if (poll.status === "failed") {
      await failVisualGeneration(db, {
        visualRequestId,
        error: new Error(poll.errorMessage || "Magnific task failed."),
        executionMode: mode,
        providerTaskId: vr.provider_request_id,
      });
      return {
        ...emptyResult(visualRequestId, "failed", "provider_error", "Tugas Magnific gagal."),
        executionMode: mode,
        providerRequestId: vr.provider_request_id,
      };
    }

    if (poll.status === "completed" && poll.assetUrl) {
      attempts.push({
        at: new Date().toISOString(),
        mode: "poll",
        taskId: poll.taskId,
        status: "completed",
      });
      await db
        .updateTable("visual_requests")
        .set({ attempt_history: JSON.stringify(attempts), updated_at: new Date().toISOString() })
        .where("id", "=", visualRequestId)
        .execute();

      const completion = await completeVisualGeneration(db, {
        visualRequestId,
        provider: vr.provider,
        executionMode: mode,
        providerTaskId: poll.taskId,
        providerCreationId: vr.provider_creation_id,
        providerAssetUrl: poll.assetUrl,
        mimeType: "image/png",
        source: "poll",
      });

      const refreshed = await db
        .selectFrom("visual_requests")
        .where("id", "=", visualRequestId)
        .selectAll()
        .executeTakeFirst();

      if (!completion.success || !refreshed) {
        return emptyResult(
          visualRequestId,
          "failed",
          (completion.errorCategory as VisualErrorCategory) ?? "storage_error",
          completion.error ?? "Completion gagal."
        );
      }
      return mapRecordToResult(refreshed);
    }

    // Still in progress — continue within bounded attempts only.
  }

  const refreshed = await db
    .selectFrom("visual_requests")
    .where("id", "=", visualRequestId)
    .selectAll()
    .executeTakeFirst();
  return refreshed ? mapRecordToResult(refreshed) : emptyResult(visualRequestId, "generating", null, null);
}

/**
 * Execute a visual generation request (submit path).
 *
 * Lifecycle: draft/pending → queued → generating (task submitted)
 *   → [poll/webhook/connector completion] → under_review
 * On immediate failure: → failed (with error classification)
 *
 * Never auto-approves. Never auto-attaches. Never auto-publishes.
 */
export async function executeVisualGeneration(
  db: Kysely<Database>,
  request: VisualGenerationRequest,
  adapter: VisualProviderAdapter
): Promise<VisualGenerationResult> {
  const executionMode: VisualExecutionMode =
    request.executionMode || (request.provider === "mock" ? "magnific_api" : "magnific_api");

  // 1. Idempotency check — only short-circuit for active/successful states.
  const existing = await findVisualByIdempotencyKey(db, request.idempotencyKey);
  if (existing && IDEMPOTENT_HIT_STATUSES.includes(existing.status)) {
    const record = await db
      .selectFrom("visual_requests")
      .where("id", "=", existing.id)
      .selectAll()
      .executeTakeFirst();
    if (record) return mapRecordToResult(record);
  }

  // 2. Active lock check (double-click / concurrent submit)
  if (await hasActiveVisualGeneration(db, request.visualRequestId)) {
    return {
      ...emptyResult(
        request.visualRequestId,
        "generating",
        "validation_error",
        "Permintaan penjanaan visual aktif sudah wujud."
      ),
      executionMode,
    };
  }

  // 3. Load the visual request
  const vr = await db
    .selectFrom("visual_requests")
    .where("id", "=", request.visualRequestId)
    .selectAll()
    .executeTakeFirst();

  if (!vr) {
    return emptyResult(request.visualRequestId, "failed", "validation_error", "Visual request tidak ditemui.");
  }

  // Bounded retries — fail closed on exhausted or non-retryable errors.
  const priorCategory = vr.error_category as VisualErrorCategory | null;
  if (
    vr.status === "failed" &&
    ((priorCategory && !isRetryableVisualError(priorCategory)) ||
      (vr.retry_count ?? 0) >= MAX_VISUAL_RETRY_COUNT)
  ) {
    return emptyResult(
      request.visualRequestId,
      "failed",
      priorCategory ?? "validation_error",
      "Mencuba semula tidak dibenarkan untuk ralat ini atau had percubaan dicapai."
    );
  }

  // 4. Compose prompt (house style + scene + role + aspect ratio)
  const composed = composeVisualPrompt({
    sceneInstruction: vr.prompt,
    role: vr.visual_role as VisualRole,
    aspectRatio: vr.aspect_ratio as AspectRatio,
    workTitle: vr.work_id ?? undefined,
    editorialOverride: request.editorialOverride,
  });

  const composedJson = JSON.stringify({
    finalPrompt: composed.finalPrompt,
    houseStyleVersion: composed.houseStyleVersion,
    provenance: composed.provenance,
  });

  const nowIso = () => new Date().toISOString();
  const attempts = parseAttemptHistory(vr.attempt_history);

  // 5. queued — store idempotency key, composed prompt, execution mode
  await db
    .updateTable("visual_requests")
    .set({
      status: "queued" as VisualRequestStatus,
      provider: request.provider,
      model: request.model ?? null,
      idempotency_key: request.idempotencyKey,
      prompt_composed: composedJson,
      requested_by: request.requestedBy ?? "admin",
      execution_mode: executionMode as never,
      error_category: null,
      error_message: null,
      updated_at: nowIso(),
    })
    .where("id", "=", request.visualRequestId)
    .execute();

  // 6. generating — started_at
  await db
    .updateTable("visual_requests")
    .set({
      status: "generating" as VisualRequestStatus,
      started_at: nowIso(),
      updated_at: nowIso(),
    })
    .where("id", "=", request.visualRequestId)
    .execute();

  // 7. Submit generation
  try {
    if (!adapter.isConfigured()) {
      throw new Error(`Provider ${request.provider} is not configured.`);
    }

    const genRequest = {
      prompt: composed.finalPrompt,
      role: vr.visual_role as VisualRole,
      aspectRatio: vr.aspect_ratio as AspectRatio,
      metadata: {
        visualRequestId: request.visualRequestId,
        workId: vr.work_id ?? undefined,
        submissionId: vr.submission_id ?? undefined,
        model: request.model,
        executionMode,
      },
    };

    // Prefer explicit async submit when available (Magnific).
    if (adapter.submitVisual) {
      const submission = await adapter.submitVisual(genRequest);

      if (submission.status === "failed" || !submission.taskId) {
        throw new Error(submission.status === "failed" ? "Provider returned failed status." : "Provider returned no task ID.");
      }

      attempts.push({
        at: nowIso(),
        mode: executionMode,
        taskId: submission.taskId,
        status: "submitted",
      });

      // If provider already completed synchronously, finish now.
      if (submission.status === "completed" && submission.assetUrl) {
        await db
          .updateTable("visual_requests")
          .set({
            provider_request_id: submission.taskId,
            attempt_history: JSON.stringify(attempts) as never,
            updated_at: nowIso(),
          })
          .where("id", "=", request.visualRequestId)
          .execute();

        const completion = await completeVisualGeneration(db, {
          visualRequestId: request.visualRequestId,
          provider: request.provider,
          executionMode,
          providerTaskId: submission.taskId,
          providerAssetUrl: submission.assetUrl,
          width: submission.width,
          height: submission.height,
          mimeType: submission.mimeType ?? "image/png",
          source: "inline",
        });

        const refreshed = await db
          .selectFrom("visual_requests")
          .where("id", "=", request.visualRequestId)
          .selectAll()
          .executeTakeFirst();

        if (!completion.success || !refreshed) {
          return emptyResult(
            request.visualRequestId,
            "failed",
            completion.errorCategory ?? "storage_error",
            completion.error ?? "Completion gagal."
          );
        }
        return mapRecordToResult(refreshed);
      }

      // Task submitted — NOT equivalent to image completion.
      await db
        .updateTable("visual_requests")
        .set({
          status: "generating" as VisualRequestStatus,
          provider_request_id: submission.taskId,
          attempt_history: JSON.stringify(attempts) as never,
          execution_mode: executionMode as never,
          updated_at: nowIso(),
        })
        .where("id", "=", request.visualRequestId)
        .execute();

      const refreshed = await db
        .selectFrom("visual_requests")
        .where("id", "=", request.visualRequestId)
        .selectAll()
        .executeTakeFirst();

      return refreshed
        ? { ...mapRecordToResult(refreshed), pendingTask: true }
        : emptyResult(request.visualRequestId, "generating", null, null);
    }

    // Sync path (mock adapter / providers without async submit).
    const response = await adapter.generateVisual(genRequest);

    if (response.status === "failed") {
      throw new Error("Provider returned failed status.");
    }

    if (response.status === "pending") {
      // Async response without submitVisual — still awaiting completion.
      attempts.push({
        at: nowIso(),
        mode: executionMode,
        taskId: response.providerRequestId,
        status: "submitted",
      });
      await db
        .updateTable("visual_requests")
        .set({
          provider_request_id: response.providerRequestId,
          attempt_history: JSON.stringify(attempts) as never,
          updated_at: nowIso(),
        })
        .where("id", "=", request.visualRequestId)
        .execute();
      const refreshed = await db
        .selectFrom("visual_requests")
        .where("id", "=", request.visualRequestId)
        .selectAll()
        .executeTakeFirst();
      return refreshed
        ? { ...mapRecordToResult(refreshed), pendingTask: true }
        : emptyResult(request.visualRequestId, "generating", null, null);
    }

    if (!response.assetUrl) {
      throw new Error("Provider returned no asset URL.");
    }

    attempts.push({
      at: nowIso(),
      mode: executionMode,
      taskId: response.providerRequestId,
      status: "completed",
    });
    await db
      .updateTable("visual_requests")
      .set({
        provider_request_id: response.providerRequestId,
        provider_creation_id: response.providerCreationId,
        attempt_history: JSON.stringify(attempts) as never,
        updated_at: nowIso(),
      })
      .where("id", "=", request.visualRequestId)
      .execute();

    const completion = await completeVisualGeneration(db, {
      visualRequestId: request.visualRequestId,
      provider: response.provider === "magnific" ? "magnific" : request.provider,
      executionMode,
      providerTaskId: response.providerRequestId,
      providerCreationId: response.providerCreationId,
      providerAssetUrl: response.assetUrl,
      width: response.width,
      height: response.height,
      mimeType: response.mimeType ?? "image/png",
      source: "inline",
    });

    const refreshed = await db
      .selectFrom("visual_requests")
      .where("id", "=", request.visualRequestId)
      .selectAll()
      .executeTakeFirst();

    if (!completion.success || !refreshed) {
      return emptyResult(
        request.visualRequestId,
        "failed",
        completion.errorCategory ?? "storage_error",
        completion.error ?? "Completion gagal."
      );
    }
    return mapRecordToResult(refreshed);
  } catch (error) {
    const errorCategory: VisualErrorCategory = classifyVisualError(error);
    const errorMessage = sanitizeVisualErrorMessage(error);

    await failVisualGeneration(db, {
      visualRequestId: request.visualRequestId,
      error,
      executionMode,
    });

    // Ensure bounded retry metadata even if failVisualGeneration raced.
    await db
      .updateTable("visual_requests")
      .set({
        status: "failed" as VisualRequestStatus,
        error_category: errorCategory as never,
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", request.visualRequestId)
      .execute();

    return {
      ...emptyResult(request.visualRequestId, "failed", errorCategory, errorMessage),
      executionMode,
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

export interface AttachGateInput {
  status: string;
  approval_state: string;
  work_id: string | null;
  asset_finalized: boolean;
  source_asset_path: string | null;
  source_asset_url: string | null;
  provider: string;
  provider_creation_id?: string | null;
  provider_request_id?: string | null;
  visual_role?: string | null;
  alt_text?: string | null;
}

export type AttachGateResult =
  | { ok: true; stableSrc: string }
  | { ok: false; error: string };

/**
 * Pure attach gate — stable asset enforcement is REAL, not nominal.
 *
 * Requires:
 * - approved status + approval_state
 * - work_id present
 * - asset_finalized === true
 * - source_asset_path non-empty (provider URL alone NEVER accepted)
 * - provider magnific (mock allowed only for tests via provider==="mock")
 * - valid role + alt text
 */
export function validateAttachGate(input: AttachGateInput): AttachGateResult {
  if (input.status !== "approved" || input.approval_state !== "approved") {
    return { ok: false, error: "Hanya visual yang telah diluluskan boleh dipautkan." };
  }

  if (!input.work_id) {
    return { ok: false, error: "Work ID diperlukan untuk pautan visual." };
  }

  if (input.provider !== "magnific" && input.provider !== "mock") {
    return { ok: false, error: "Hanya visual Magnific boleh dipautkan." };
  }

  if (input.provider === "magnific" && !input.provider_request_id && !input.provider_creation_id) {
    return { ok: false, error: "Provenance Magnific diperlukan untuk pautan." };
  }

  if (!input.asset_finalized) {
    return {
      ok: false,
      error: "Asset belum stabil (asset_finalized=false). Tidak boleh dipautkan.",
    };
  }

  const stableSrc = (input.source_asset_path ?? "").trim();
  if (!stableSrc) {
    return {
      ok: false,
      error: "source_asset_path diperlukan. URL provider tidak diterima sebagai src kanonik.",
    };
  }

  if (!input.visual_role) {
    return { ok: false, error: "Role visual diperlukan." };
  }

  if (!(input.alt_text ?? "").trim()) {
    return { ok: false, error: "Alt text diperlukan untuk pautan visual." };
  }

  return { ok: true, stableSrc };
}

/**
 * Attach an approved visual request to a canonical Work.
 *
 * Only approved requests with a FINALIZED stable asset may be attached.
 * visuals.src = source_asset_path ONLY (never provider URL).
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

  const gate = validateAttachGate({
    status: vr.status,
    approval_state: vr.approval_state,
    work_id: vr.work_id,
    asset_finalized: vr.asset_finalized,
    source_asset_path: vr.source_asset_path,
    source_asset_url: vr.source_asset_url,
    provider: vr.provider,
    provider_creation_id: vr.provider_creation_id,
    provider_request_id: vr.provider_request_id,
    visual_role: vr.visual_role,
    alt_text: vr.alt_text,
  });

  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  // Validate Work exists. Never auto-publish.
  const work = await db
    .selectFrom("works")
    .where("id", "=", vr.work_id!)
    .select(["id", "status"])
    .executeTakeFirst();

  if (!work) {
    return { success: false, error: "Work tidak ditemui." };
  }

  const insertResult = await db
    .insertInto("visuals")
    .values({
      work_id: vr.work_id!,
      role: vr.visual_role as VisualRole,
      src: gate.stableSrc,
      alt: vr.alt_text,
      provider: vr.provider,
      creation_id: vr.provider_creation_id ?? vr.provider_request_id,
      anchor: vr.anchor,
      place: vr.place,
      sort_order: 0,
      is_asset_finalized: true,
      created_at: new Date().toISOString(),
    } as never)
    .returning("id")
    .executeTakeFirst();

  if (!insertResult) {
    return { success: false, error: "Gagal mencipta visual record." };
  }

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
