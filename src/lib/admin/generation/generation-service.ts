/**
 * Generation orchestration service.
 *
 * Coordinates: prompt composition → provider call → identity handshake → submission update.
 * Enforces idempotency, auditability, and privacy boundaries.
 * Does NOT auto-create Works or auto-publish.
 */

import type { Kysely } from "kysely";
import type { Database, GenerationRequestStatus, WorkType } from "../../db/types";
import type { ProviderAdapter, GenerateTextResponse, ErrorCategory } from "./adapter";
import { classifyProviderError, sanitizeErrorMessage } from "./adapter";
import { resolvePromptTemplates, composePrompts } from "./prompt-composer";
import { validateHandshake, handshakeToContributionFields } from "../identity-handshake";
import { registerIdentityHandshake } from "../contribution-service";

export interface GenerationRequest {
  submissionId: number;
  provider: string;
  model: string;
  requestedBy?: string;
  promptTemplateId?: number;
  submissionBrief: string;
  submissionTitle?: string | null;
  workType?: WorkType | null;
  idempotencyKey: string;
}

export interface GenerationResult {
  requestId: number;
  status: GenerationRequestStatus;
  manuscript: string | null;
  errorCategory: string | null;
  errorMessage: string | null;
}

/**
 * Check for existing active generation on a submission.
 * Prevents duplicate concurrent generations (idempotency).
 */
export async function hasActiveGeneration(
  db: Kysely<Database>,
  submissionId: number
): Promise<boolean> {
  const active = await db
    .selectFrom("generation_requests")
    .where("submission_id", "=", submissionId)
    .where("status", "in", ["queued", "running"])
    .select("id")
    .executeTakeFirst();

  return !!active;
}

/**
 * Check for existing idempotency key.
 */
export async function findByIdempotencyKey(
  db: Kysely<Database>,
  idempotencyKey: string
): Promise<{ id: number; status: GenerationRequestStatus } | undefined> {
  return db
    .selectFrom("generation_requests")
    .where("idempotency_key", "=", idempotencyKey)
    .select(["id", "status"])
    .executeTakeFirst() ?? null;
}

/**
 * Create a generation request and execute it.
 * Returns the generation result.
 */
export async function executeGeneration(
  db: Kysely<Database>,
  request: GenerationRequest,
  adapter: ProviderAdapter
): Promise<GenerationResult> {
  // 1. Idempotency check — existing request with same key
  const existing = await findByIdempotencyKey(db, request.idempotencyKey);
  if (existing) {
    const record = await db
      .selectFrom("generation_requests")
      .where("id", "=", existing.id)
      .select(["result_manuscript", "error_category", "error_message", "status"])
      .executeTakeFirst();

    return {
      requestId: existing.id,
      status: existing.status,
      manuscript: record?.result_manuscript ?? null,
      errorCategory: record?.error_category ?? null,
      errorMessage: record?.error_message ?? null,
    };
  }

  // 2. Active generation lock — prevent concurrent on same submission
  if (await hasActiveGeneration(db, request.submissionId)) {
    return {
      requestId: 0,
      status: "failed",
      manuscript: null,
      errorCategory: "validation_error",
      errorMessage: "Permintaan penjanaan aktif sudah wujud untuk penghantaran ini.",
    };
  }

  // 3. Resolve prompt templates
  const templates = await resolvePromptTemplates(
    db,
    request.workType ?? null,
    request.promptTemplateId
  );

  const composed = composePrompts(
    templates,
    request.submissionBrief,
    request.submissionTitle
  );

  // 4. Create the generation request record (queued)
  const insertResult = await db
    .insertInto("generation_requests")
    .values({
      submission_id: request.submissionId,
      prompt_template_id: request.promptTemplateId ?? null,
      prompt_composed: JSON.stringify({
        systemPrompt: composed.systemPrompt,
        userPrompt: composed.userPrompt,
        templateIds: composed.templateIds,
        templateNames: composed.templateNames,
        templateVersions: composed.templateVersions,
      }),
      provider: request.provider,
      model: request.model,
      status: "queued" as GenerationRequestStatus,
      requested_by: request.requestedBy ?? "admin",
      idempotency_key: request.idempotencyKey,
      currency: "usd",
    } as never)
    .returning("id")
    .executeTakeFirst();

  const requestId = insertResult?.id ?? 0;

  // 5. Update status to running
  await db
    .updateTable("generation_requests")
    .set({ status: "running", started_at: new Date().toISOString() })
    .where("id", "=", requestId)
    .execute();

  // 6. Execute generation
  try {
    const response: GenerateTextResponse = await adapter.generateText({
      systemPrompt: composed.systemPrompt,
      userPrompt: composed.userPrompt,
      model: request.model,
      metadata: {
        submissionId: request.submissionId,
        promptTemplateId: request.promptTemplateId,
        workType: request.workType ?? undefined,
      },
    });

    // 7. Validate adapter configuration
    if (!adapter.isConfigured()) {
      throw new Error(`Provider ${request.provider} is not configured.`);
    }

    // 8. Store success
    await db
      .updateTable("generation_requests")
      .set({
        status: "succeeded",
        result_manuscript: response.content,
        provider_request_id: response.requestId,
        token_input: response.usage.inputTokens,
        token_output: response.usage.outputTokens,
        token_total: response.usage.totalTokens,
        estimated_cost_cents: response.usage.estimatedCostCents,
        completed_at: new Date().toISOString(),
      })
      .where("id", "=", requestId)
      .execute();

    // 9. Update submission with generated manuscript
    await db
      .updateTable("work_submissions")
      .set({
        manuscript: response.content,
        submitter_type: "ai",
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", request.submissionId)
      .execute();

    // 10. Register identity handshake via contribution
    const handshakePayload = {
      provider: response.runtimeIdentity.provider,
      model: response.runtimeIdentity.model,
      actualRole: "draft_writer",
      identitySource: "runtime_verified" as const,
      runtimeVerification: {
        verifiedAt: response.runtimeIdentity.verifiedAt,
        verificationMethod: response.runtimeIdentity.verificationMethod,
        confidence: response.runtimeIdentity.confidence,
      },
    };

    const validated = validateHandshake(handshakePayload);
    if (validated.isValid) {
      const fields = handshakeToContributionFields(validated);

      // Create contribution linked to this submission
      const contribution = await db
        .insertInto("submission_contributions")
        .values({
          submission_id: request.submissionId,
          role_key: fields.ai_actual_role,
          role_label: fields.ai_actual_role === "draft_writer" ? "Penulis Draf" : (fields.ai_actual_role ?? ""),
          sort_order: 0,
          suggested_public_credit: validated.publicPersona || null,
          ai_provider: fields.ai_provider,
          ai_model: fields.ai_model,
          ai_persona: fields.ai_persona,
          ai_actual_role: fields.ai_actual_role,
          ai_identity_source: fields.ai_identity_source,
          created_at: new Date().toISOString(),
        } as never)
        .returning("id")
        .executeTakeFirst();

      // Link contribution to the generation request
      if (contribution?.id) {
        // Store the generation request ID for audit trail
        // (contribution doesn't have a generation_request_id column,
        //  but the handshake fields + timestamps provide the link)
      }
    }

    return {
      requestId,
      status: "succeeded",
      manuscript: response.content,
      errorCategory: null,
      errorMessage: null,
    };
  } catch (error) {
    // 11. Store failure
    const errorCategory = classifyProviderError(error);
    const errorMessage = sanitizeErrorMessage(error);

    await db
      .updateTable("generation_requests")
      .set({
        status: "failed",
        error_category: errorCategory,
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
      })
      .where("id", "=", requestId)
      .execute();

    return {
      requestId,
      status: "failed",
      manuscript: null,
      errorCategory,
      errorMessage,
    };
  }
}
