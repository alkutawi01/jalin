/**
 * Magnific visual generation adapter.
 * The REQUIRED production provider for all Jalin imagery (AGENTS.md rule 15).
 *
 * Verified against CURRENT official docs (docs.magnific.com) on 2026-09-23:
 * - Base URL: https://api.magnific.com
 * - Auth header: x-magnific-api-key (NOT Authorization: Bearer)
 * - Primary endpoint: POST /v1/ai/mystic (async)
 * - Task status: GET /v1/ai/mystic/{task-id}
 * - Task statuses: CREATED | IN_PROGRESS | COMPLETED | FAILED
 * - Response: { data: { task_id, status, generated?: string[] } }
 * - Webhook: optional webhook_url; headers webhook-id / webhook-timestamp /
 *   webhook-signature (HMAC-SHA256 base64 of id.timestamp.body)
 * - Models (Mystic): realism | fluid | zen | flexible | super_real | editorial_portraits
 *
 * Uses raw fetch — no SDK dependency. Fail closed if credentials unavailable.
 * API key: MAGNIFIC_API_KEY (server-side only, never exposed).
 */

import type {
  VisualProviderAdapter,
  GenerateVisualRequest,
  GenerateVisualResponse,
  SubmitVisualResult,
  PollVisualTaskResult,
  VisualTaskStatus,
} from "./adapter";
import { aspectRatioToDimensions } from "./house-style";

export const MAGNIFIC_BASE_URL = "https://api.magnific.com";
export const MAGNIFIC_GENERATE_PATH = "/v1/ai/mystic";
export const MAGNIFIC_TASK_PATH = "/v1/ai/mystic";

/** Verified official Mystic model identifiers. */
export const MAGNIFIC_SUPPORTED_MODELS = [
  "flexible",
  "fluid",
  "realism",
  "zen",
  "super_real",
  "editorial_portraits",
] as const;

/** Default model — flexible is Magnific's recommended profile for illustrations. */
export const MAGNIFIC_DEFAULT_MODEL = "flexible";

/** Verified official Magnific aspect_ratio enum values. */
export const MAGNIFIC_ASPECT_RATIOS: Record<string, string> = {
  "1:1": "square_1_1",
  "3:2": "standard_3_2",
  "2:3": "portrait_2_3",
  "16:9": "widescreen_16_9",
  "9:16": "social_story_9_16",
  "4:3": "classic_4_3",
  "3:4": "traditional_3_4",
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function magnificGenerateUrl(baseUrl = MAGNIFIC_BASE_URL): string {
  const override = process.env.MAGNIFIC_API_URL?.trim();
  if (override) {
    // Accept either a full endpoint URL or a base URL.
    if (override.includes("/v1/")) return override.replace(/\/$/, "");
    return `${override.replace(/\/$/, "")}${MAGNIFIC_GENERATE_PATH}`;
  }
  return `${baseUrl.replace(/\/$/, "")}${MAGNIFIC_GENERATE_PATH}`;
}

export function magnificTaskUrl(taskId: string, baseUrl = MAGNIFIC_BASE_URL): string {
  const override = process.env.MAGNIFIC_API_URL?.trim();
  let base = baseUrl;
  if (override) {
    if (override.includes("/v1/")) {
      base = override.replace(/\/v1\/.*$/, "");
    } else {
      base = override.replace(/\/$/, "");
    }
  }
  return `${base.replace(/\/$/, "")}${MAGNIFIC_TASK_PATH}/${encodeURIComponent(taskId)}`;
}

export function magnificAuthHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-magnific-api-key": apiKey,
  };
}

export function mapAspectRatioToMagnific(aspectRatio: string): string {
  return MAGNIFIC_ASPECT_RATIOS[aspectRatio] ?? MAGNIFIC_ASPECT_RATIOS["3:2"];
}

export function resolveMagnificModel(model?: string | null): string {
  if (model && (MAGNIFIC_SUPPORTED_MODELS as readonly string[]).includes(model)) {
    return model;
  }
  return MAGNIFIC_DEFAULT_MODEL;
}

export function resolveWebhookUrl(): string | undefined {
  const explicit = process.env.MAGNIFIC_WEBHOOK_URL?.trim();
  if (explicit) return explicit;
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  if (!appUrl) return undefined;
  return `${appUrl}/api/webhooks/magnific`;
}

export function buildMagnificRequestBody(request: GenerateVisualRequest): Record<string, unknown> {
  const model = resolveMagnificModel(
    (request.metadata?.model as string | undefined) ?? request.metadata?.model
  );
  const body: Record<string, unknown> = {
    prompt: request.prompt,
    aspect_ratio: mapAspectRatioToMagnific(request.aspectRatio),
    model,
    filter_nsfw: true,
  };
  const webhookUrl = resolveWebhookUrl();
  if (webhookUrl) {
    body.webhook_url = webhookUrl;
  }
  return body;
}

export function normalizeMagnificStatus(raw: unknown): VisualTaskStatus {
  const status = String(raw ?? "").toUpperCase();
  if (status === "COMPLETED" || status === "SUCCEEDED" || status === "SUCCESS") return "completed";
  if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") return "failed";
  if (status === "CREATED" || status === "QUEUED" || status === "SUBMITTED") return "submitted";
  return "in_progress";
}

export function parseMagnificTaskPayload(payload: unknown): {
  taskId: string | null;
  status: VisualTaskStatus;
  generated: string[];
  hasNsfw: boolean | null;
} {
  const root = payload as Record<string, unknown> | null;
  if (!root || typeof root !== "object") {
    return { taskId: null, status: "failed", generated: [], hasNsfw: null };
  }

  // Accept both { data: task } and bare task (webhook payload shape).
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const taskId =
    (typeof data.task_id === "string" && data.task_id) ||
    (typeof data.taskId === "string" && data.taskId) ||
    (typeof data.id === "string" && data.id) ||
    null;

  const generatedRaw = data.generated;
  const generated = Array.isArray(generatedRaw)
    ? generatedRaw.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];

  let hasNsfw: boolean | null = null;
  if (Array.isArray(data.has_nsfw) && typeof data.has_nsfw[0] === "boolean") {
    hasNsfw = data.has_nsfw[0] as boolean;
  } else if (typeof data.has_nsfw === "boolean") {
    hasNsfw = data.has_nsfw;
  }

  return {
    taskId,
    status: normalizeMagnificStatus(data.status),
    generated,
    hasNsfw,
  };
}

export interface MagnificAdapterOptions {
  fetchImpl?: FetchLike;
}

export function createMagnificAdapter(options: MagnificAdapterOptions = {}): VisualProviderAdapter {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));

  async function assertConfigured(): Promise<string> {
    const apiKey = process.env.MAGNIFIC_API_KEY;
    if (!apiKey) {
      throw new Error("MAGNIFIC_API_KEY not configured.");
    }
    return apiKey;
  }

  async function readError(response: Response): Promise<Error> {
    const errorBody = await response.text().catch(() => "");
    const snippet = errorBody.substring(0, 200);
    if (response.status === 401) {
      return new Error(`Magnific API unauthorized 401: ${snippet}`);
    }
    if (response.status === 429) {
      return new Error(`Magnific API rate limit 429: ${snippet}`);
    }
    return new Error(`Magnific API error ${response.status}: ${snippet}`);
  }

  return {
    providerName: "magnific",
    supportedModels: [...MAGNIFIC_SUPPORTED_MODELS],

    isConfigured(): boolean {
      return !!process.env.MAGNIFIC_API_KEY;
    },

    async submitVisual(request: GenerateVisualRequest): Promise<SubmitVisualResult> {
      const apiKey = await assertConfigured();
      const dimensions = aspectRatioToDimensions(request.aspectRatio);
      const body = buildMagnificRequestBody(request);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      try {
        const response = await fetchImpl(magnificGenerateUrl(), {
          method: "POST",
          headers: magnificAuthHeaders(apiKey),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw await readError(response);
        }

        const data = await response.json();
        const parsed = parseMagnificTaskPayload(data);

        if (!parsed.taskId) {
          throw new Error("Magnific API returned no task_id.");
        }

        return {
          provider: "magnific",
          taskId: parsed.taskId,
          status: parsed.status === "failed" ? "failed" : parsed.status === "completed" ? "completed" : "submitted",
          assetUrl: parsed.generated[0] ?? null,
          width: parsed.status === "completed" ? dimensions.width : null,
          height: parsed.status === "completed" ? dimensions.height : null,
          mimeType: parsed.status === "completed" ? "image/png" : null,
          metadata: {
            model: body.model,
            aspectRatio: request.aspectRatio,
            magnificAspectRatio: body.aspect_ratio,
            submittedAt: new Date().toISOString(),
            endpoint: magnificGenerateUrl(),
          },
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    },

    async pollVisualTask(taskId: string): Promise<PollVisualTaskResult> {
      const apiKey = await assertConfigured();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const response = await fetchImpl(magnificTaskUrl(taskId), {
          method: "GET",
          headers: {
            "x-magnific-api-key": apiKey,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw await readError(response);
        }

        const data = await response.json();
        const parsed = parseMagnificTaskPayload(data);

        return {
          provider: "magnific",
          taskId: parsed.taskId ?? taskId,
          status: parsed.status,
          assetUrl: parsed.generated[0] ?? null,
          generated: parsed.generated,
          errorMessage:
            parsed.status === "failed" ? "Magnific task failed." : null,
          metadata: {
            hasNsfw: parsed.hasNsfw,
            polledAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    },

    async generateVisual(request: GenerateVisualRequest): Promise<GenerateVisualResponse> {
      const submission = await this.submitVisual!(request);

      if (submission.status === "failed") {
        return {
          provider: "magnific",
          providerRequestId: submission.taskId,
          providerCreationId: null,
          status: "failed",
          assetUrl: null,
          width: null,
          height: null,
          mimeType: null,
          taskStatus: "failed",
          metadata: submission.metadata,
        };
      }

      if (submission.status === "completed" && submission.assetUrl) {
        return {
          provider: "magnific",
          providerRequestId: submission.taskId,
          providerCreationId: null,
          status: "succeeded",
          assetUrl: submission.assetUrl,
          width: submission.width,
          height: submission.height,
          mimeType: submission.mimeType ?? "image/png",
          taskStatus: "completed",
          metadata: submission.metadata,
        };
      }

      // Async task submitted — NOT equivalent to image completion.
      return {
        provider: "magnific",
        providerRequestId: submission.taskId,
        providerCreationId: null,
        status: "pending",
        assetUrl: null,
        width: null,
        height: null,
        mimeType: null,
        taskStatus: submission.status === "submitted" ? "submitted" : "in_progress",
        metadata: submission.metadata,
      };
    },

    validateModel(model: string): boolean {
      return (MAGNIFIC_SUPPORTED_MODELS as readonly string[]).includes(model);
    },
  };
}
