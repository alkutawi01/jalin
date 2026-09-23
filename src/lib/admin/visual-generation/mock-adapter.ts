/**
 * Deterministic mock visual adapter for testing.
 * Returns fixed asset data — no real API calls, no Magnific credits spent.
 */

import type {
  VisualProviderAdapter,
  GenerateVisualRequest,
  GenerateVisualResponse,
} from "./adapter";
import { aspectRatioToDimensions } from "./house-style";

export function createMockVisualAdapter(): VisualProviderAdapter {
  return {
    providerName: "mock",
    supportedModels: ["mock-v1", "mock-deterministic"],

    isConfigured(): boolean {
      return true;
    },

    async generateVisual(request: GenerateVisualRequest): Promise<GenerateVisualResponse> {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const dimensions = aspectRatioToDimensions(request.aspectRatio);

      return {
        provider: "mock",
        providerRequestId: `mock-req-${Date.now()}`,
        providerCreationId: `mock-creation-${Date.now()}`,
        status: "succeeded",
        assetUrl: `https://mock.jalin.test/assets/mock-${Date.now()}.png`,
        width: dimensions.width,
        height: dimensions.height,
        mimeType: "image/png",
        metadata: {
          deterministic: true,
          test_verification: "test_deterministic",
          role: request.role,
          aspectRatio: request.aspectRatio,
          generatedAt: new Date().toISOString(),
        },
      };
    },

    validateModel(model: string): boolean {
      return this.supportedModels.includes(model);
    },
  };
}
