/**
 * Magnific visual generation adapter.
 * The REQUIRED production provider for all Jalin imagery (AGENTS.md rule 15).
 *
 * Uses raw fetch — no SDK dependency. Provider-specific logic stays here.
 *
 * API key: MAGNIFIC_API_KEY env var (server-side only, never exposed).
 * Fail closed if credentials unavailable.
 */

import type {
  VisualProviderAdapter,
  GenerateVisualRequest,
  GenerateVisualResponse,
} from "./adapter";
import { aspectRatioToDimensions } from "./house-style";

const MAGNIFIC_API_URL = process.env.MAGNIFIC_API_URL || "https://api.magnific.ai/v1/images/generations";

export const MAGNIFIC_SUPPORTED_MODELS = [
  "magnific-spark",
  "magnific-phoenix",
  "magnific-velocity",
] as const;

export function createMagnificAdapter(): VisualProviderAdapter {
  return {
    providerName: "magnific",
    supportedModels: [...MAGNIFIC_SUPPORTED_MODELS],

    isConfigured(): boolean {
      return !!process.env.MAGNIFIC_API_KEY;
    },

    async generateVisual(request: GenerateVisualRequest): Promise<GenerateVisualResponse> {
      const apiKey = process.env.MAGNIFIC_API_KEY;
      if (!apiKey) {
        throw new Error("MAGNIFIC_API_KEY not configured.");
      }

      const dimensions = aspectRatioToDimensions(request.aspectRatio);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      try {
        const response = await fetch(MAGNIFIC_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: request.prompt,
            width: dimensions.width,
            height: dimensions.height,
            model: request.metadata?.model || MAGNIFIC_SUPPORTED_MODELS[0],
            num_images: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Magnific API error ${response.status}: ${errorBody.substring(0, 200)}`);
        }

        const data = await response.json();
        const image = data.data?.[0] ?? data.images?.[0] ?? data.output?.[0];

        if (!image) {
          throw new Error("Magnific API returned no image data.");
        }

        return {
          provider: "magnific",
          providerRequestId: data.id ?? image.id ?? null,
          providerCreationId: image.creation_id ?? image.id ?? null,
          status: "succeeded",
          assetUrl: image.url ?? image.image_url ?? null,
          width: image.width ?? dimensions.width,
          height: image.height ?? dimensions.height,
          mimeType: image.mime_type ?? image.type ?? "image/png",
          metadata: {
            model: request.metadata?.model || MAGNIFIC_SUPPORTED_MODELS[0],
            aspectRatio: request.aspectRatio,
            generatedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    },

    validateModel(model: string): boolean {
      return (MAGNIFIC_SUPPORTED_MODELS as readonly string[]).includes(model);
    },
  };
}
