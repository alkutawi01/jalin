/**
 * Visual generation provider adapter interface.
 *
 * Each visual provider implements this interface. All provider-specific
 * logic (API URLs, auth, request/response mapping) stays inside the adapter.
 * No provider logic in API routes or services.
 */

import type { AspectRatio, VisualRole } from "../../db/types";

export interface GenerateVisualRequest {
  prompt: string;
  role: VisualRole;
  aspectRatio: AspectRatio;
  referenceAssets?: string[];
  metadata?: {
    visualRequestId?: number;
    workId?: string;
    submissionId?: number;
    [key: string]: unknown;
  };
}

export interface GenerateVisualResponse {
  provider: string;
  providerRequestId: string | null;
  providerCreationId: string | null;
  status: "succeeded" | "failed";
  assetUrl: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  metadata: Record<string, unknown>;
}

export interface VisualProviderAdapter {
  readonly providerName: string;
  readonly supportedModels: string[];

  /** Check if this adapter is configured (API key present). Fail closed. */
  isConfigured(): boolean;

  /**
   * Generate a visual using the provider.
   * Throws on failure — caller handles error classification.
   */
  generateVisual(request: GenerateVisualRequest): Promise<GenerateVisualResponse>;

  /** Validate that a model string is supported by this provider. */
  validateModel(model: string): boolean;
}

/** Error classification for visual provider errors. */
export type VisualErrorCategory =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "provider_error"
  | "asset_download_error"
  | "storage_error"
  | "validation_error"
  | "unknown";

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
