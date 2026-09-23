/**
 * Provider adapter interface for AI text generation.
 *
 * Each provider implements this interface. All provider-specific logic
 * stays behind the adapter. No provider logic in API routes.
 */

export interface GenerateTextRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  metadata?: {
    submissionId?: number;
    promptTemplateId?: number;
    workType?: string;
    [key: string]: unknown;
  };
}

export interface GenerateTextUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostCents: number | null;
  currency: string;
}

export interface RuntimeIdentity {
  provider: string;
  model: string;
  requestId: string | null;
  verifiedAt: string;
  verificationMethod: string;
  confidence: number;
}

export interface GenerateTextResponse {
  content: string;
  provider: string;
  model: string;
  requestId: string | null;
  usage: GenerateTextUsage;
  finishReason: string;
  runtimeIdentity: RuntimeIdentity;
}

export interface ProviderAdapter {
  readonly providerName: string;
  readonly supportedModels: string[];

  /**
   * Check if this adapter is configured (API key present).
   */
  isConfigured(): boolean;

  /**
   * Generate text using the provider.
   * Throws on failure — caller handles error classification.
   */
  generateText(request: GenerateTextRequest): Promise<GenerateTextResponse>;

  /**
   * Validate that a model string is supported by this provider.
   */
  validateModel(model: string): boolean;
}

/**
 * Error classification for provider errors.
 */
export type ErrorCategory =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "provider_error"
  | "validation_error"
  | "unknown";

export function classifyProviderError(error: unknown): ErrorCategory {
  if (!(error instanceof Error)) return "unknown";

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (name === "authenticationerror" || message.includes("api key") || message.includes("unauthorized") || message.includes("401")) {
    return "auth";
  }
  if (name === "ratelimiterror" || message.includes("rate limit") || message.includes("429")) {
    return "rate_limit";
  }
  if (name === "aborterror" || message.includes("timeout") || message.includes("timed out")) {
    return "timeout";
  }
  if (message.includes("invalid") || message.includes("validation") || message.includes("400")) {
    return "validation_error";
  }
  if (message.includes("500") || message.includes("502") || message.includes("503")) {
    return "provider_error";
  }

  return "unknown";
}

/**
 * Sanitize error message for storage — never expose raw provider payloads.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  return error.message.substring(0, 500);
}
