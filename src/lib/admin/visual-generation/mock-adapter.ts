/**
 * Deterministic mock visual adapter for testing.
 * Returns fixed asset data — no real API calls, no Magnific credits spent.
 *
 * Supports both generateVisual (sync complete) and submitVisual/pollVisualTask
 * so async lifecycle can be exercised without spending credits.
 */

import type {
  VisualProviderAdapter,
  GenerateVisualRequest,
  GenerateVisualResponse,
  SubmitVisualResult,
  PollVisualTaskResult,
} from "./adapter";
import { aspectRatioToDimensions } from "./house-style";

export function createMockVisualAdapter(
  options: { completeOnSubmit?: boolean } = {}
): VisualProviderAdapter {
  const completeOnSubmit = options.completeOnSubmit ?? true;
  const tasks = new Map<string, { status: "submitted" | "completed" | "failed"; url: string }>();

  return {
    providerName: "mock",
    supportedModels: ["mock-v1", "mock-deterministic"],

    isConfigured(): boolean {
      return true;
    },

    async submitVisual(request: GenerateVisualRequest): Promise<SubmitVisualResult> {
      await new Promise((resolve) => setTimeout(resolve, 5));
      const taskId = `mock-task-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const url = `https://mock.jalin.test/assets/${taskId}.png`;
      tasks.set(taskId, { status: completeOnSubmit ? "completed" : "submitted", url });
      const dimensions = aspectRatioToDimensions(request.aspectRatio);

      return {
        provider: "mock",
        taskId,
        status: completeOnSubmit ? "completed" : "submitted",
        assetUrl: completeOnSubmit ? url : null,
        width: completeOnSubmit ? dimensions.width : null,
        height: completeOnSubmit ? dimensions.height : null,
        mimeType: completeOnSubmit ? "image/png" : null,
        metadata: {
          deterministic: true,
          test_verification: "test_deterministic",
          role: request.role,
          aspectRatio: request.aspectRatio,
          submittedAt: new Date().toISOString(),
        },
      };
    },

    async pollVisualTask(taskId: string): Promise<PollVisualTaskResult> {
      const task = tasks.get(taskId);
      if (!task) {
        return {
          provider: "mock",
          taskId,
          status: "failed",
          assetUrl: null,
          generated: [],
          errorMessage: "Unknown mock task.",
          metadata: {},
        };
      }
      task.status = "completed";
      return {
        provider: "mock",
        taskId,
        status: task.status,
        assetUrl: task.url,
        generated: [task.url],
        errorMessage: null,
        metadata: { deterministic: true },
      };
    },

    async generateVisual(request: GenerateVisualRequest): Promise<GenerateVisualResponse> {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const dimensions = aspectRatioToDimensions(request.aspectRatio);
      const taskId = `mock-req-${Date.now()}`;
      const url = `https://mock.jalin.test/assets/mock-${Date.now()}.png`;

      return {
        provider: "mock",
        providerRequestId: taskId,
        providerCreationId: `mock-creation-${Date.now()}`,
        status: "succeeded",
        assetUrl: url,
        width: dimensions.width,
        height: dimensions.height,
        mimeType: "image/png",
        taskStatus: "completed",
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
