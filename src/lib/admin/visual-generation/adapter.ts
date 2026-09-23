/**
 * Visual generation provider adapter interface.
 *
 * Each visual provider implements this interface. All provider-specific
 * logic (API URLs, auth, request/response mapping) stays inside the adapter.
 * No provider logic in API routes or services.
 *
 * Only Magnific is permitted as an image provider (AGENTS.md rule 15).
 * Execution mode (magnific_api | magnific_connector) is NOT a provider.
 */

import type { AspectRatio, VisualRole } from "../../db/types";

export type VisualExecutionMode = "magnific_api" | "magnific_connector";

export type VisualTaskStatus = "submitted" | "in_progress" | "completed" | "failed";

export interface GenerateVisualRequest {
  prompt: string;
  role: VisualRole;
  aspectRatio: AspectRatio;
  referenceAssets?: string[];
  metadata?: {
    visualRequestId?: number;
    workId?: string;
    submissionId?: number;
    model?: string;
    executionMode?: VisualExecutionMode;
    [key: string]: unknown;
  };
}

export interface GenerateVisualResponse {
  provider: string;
  providerRequestId: string | null;
  providerCreationId: string | null;
  status: "succeeded" | "failed" | "pending";
  assetUrl: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  taskStatus?: VisualTaskStatus;
  metadata: Record<string, unknown>;
}

export interface SubmitVisualResult {
  provider: string;
  taskId: string | null;
  status: VisualTaskStatus;
  assetUrl: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  metadata: Record<string, unknown>;
}

export interface PollVisualTaskResult {
  provider: string;
  taskId: string;
  status: VisualTaskStatus;
  assetUrl: string | null;
  generated: string[];
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

export interface VisualProviderAdapter {
  readonly providerName: string;
  readonly supportedModels: string[];

  /** Check if this adapter is configured (API key present). Fail closed. */
  isConfigured(): boolean;

  /**
   * Generate a visual using the provider.
   * Async providers may return status "pending" with a provider task ID.
   * Throws on failure — caller handles error classification.
   */
  generateVisual(request: GenerateVisualRequest): Promise<GenerateVisualResponse>;

  /** Submit an async generation task. Optional — sync adapters may omit. */
  submitVisual?(request: GenerateVisualRequest): Promise<SubmitVisualResult>;

  /** Poll a previously submitted task. Bounded by the caller. */
  pollVisualTask?(taskId: string): Promise<PollVisualTaskResult>;

  /** Validate that a model string is supported by this provider. */
  validateModel(model: string): boolean;
}

/** Error classification for visual provider errors. */
export type VisualErrorCategory =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "provider_error"
  | "webhook_signature_error"
  | "asset_download_error"
  | "storage_error"
  | "validation_error"
  | "unknown";

export const MAX_VISUAL_RETRY_COUNT = 3;

const NON_RETRYABLE: ReadonlySet<VisualErrorCategory> = new Set([
  "auth",
  "validation_error",
  "webhook_signature_error",
]);

export function isRetryableVisualError(category: VisualErrorCategory): boolean {
  return !NON_RETRYABLE.has(category);
}

export function classifyVisualError(error: unknown): VisualErrorCategory {
  if (!(error instanceof Error)) return "unknown";

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (
    name === "authenticationerror" ||
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("401")
  ) {
    return "auth";
  }
  if (name === "ratelimiterror" || message.includes("rate limit") || message.includes("429")) {
    return "rate_limit";
  }
  if (name === "aborterror" || message.includes("timeout") || message.includes("timed out")) {
    return "timeout";
  }
  if (message.includes("webhook signature") || message.includes("webhook-signature")) {
    return "webhook_signature_error";
  }
  if (message.includes("download") || message.includes("fetch asset")) {
    return "asset_download_error";
  }
  if (message.includes("storage") || message.includes("upload")) {
    return "storage_error";
  }
  if (message.includes("invalid") || message.includes("validation") || message.includes("400")) {
    return "validation_error";
  }
  if (message.includes("500") || message.includes("502") || message.includes("503")) {
    return "provider_error";
  }

  return "unknown";
}

/** Sanitize error message for storage — never expose raw provider payloads. */
export function sanitizeVisualErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  return error.message.substring(0, 500);
}
