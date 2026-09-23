/**
 * OpenAI provider adapter.
 * Uses raw fetch — no SDK dependency required.
 *
 * API key: OPENAI_API_KEY env var (server-side only, never exposed).
 */

import type {
  ProviderAdapter,
  GenerateTextRequest,
  GenerateTextResponse,
  GenerateTextUsage,
  RuntimeIdentity,
} from "./adapter";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export const OPENAI_SUPPORTED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
] as const;

export function createOpenAIAdapter(): ProviderAdapter {
  return {
    providerName: "openai",
    supportedModels: [...OPENAI_SUPPORTED_MODELS],

    isConfigured(): boolean {
      return !!process.env.OPENAI_API_KEY;
    },

    async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured.");
      }

      if (!this.validateModel(request.model)) {
        throw new Error(`Unsupported OpenAI model: ${request.model}`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      try {
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: request.model,
            messages: [
              { role: "system", content: request.systemPrompt },
              { role: "user", content: request.userPrompt },
            ],
            temperature: 0.8,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenAI API error ${response.status}: ${errorBody.substring(0, 200)}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const content = choice?.message?.content ?? "";
        const finishReason = choice?.finish_reason ?? "unknown";

        const usage: GenerateTextUsage = {
          inputTokens: data.usage?.prompt_tokens ?? null,
          outputTokens: data.usage?.completion_tokens ?? null,
          totalTokens: data.usage?.total_tokens ?? null,
          estimatedCostCents: null, // OpenAI pricing varies; store null
          currency: "usd",
        };

        const runtimeIdentity: RuntimeIdentity = {
          provider: "openai",
          model: request.model,
          requestId: data.id ?? null,
          verifiedAt: new Date().toISOString(),
          verificationMethod: "api_response_header",
          confidence: 1.0,
        };

        return {
          content,
          provider: "openai",
          model: request.model,
          requestId: data.id ?? null,
          usage,
          finishReason,
          runtimeIdentity,
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    },

    validateModel(model: string): boolean {
      return (OPENAI_SUPPORTED_MODELS as readonly string[]).includes(model);
    },
  };
}
