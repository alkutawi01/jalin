export type {
  GenerateVisualRequest,
  GenerateVisualResponse,
  VisualProviderAdapter,
  VisualErrorCategory,
} from "./adapter";
export { classifyVisualError, sanitizeVisualErrorMessage } from "./adapter";
export { createMagnificAdapter, MAGNIFIC_SUPPORTED_MODELS } from "./magnific-adapter";
export { createMockVisualAdapter } from "./mock-adapter";
export {
  JALIN_HOUSE_STYLE,
  SUPPORTED_ASPECT_RATIOS,
  aspectRatioToDimensions,
} from "./house-style";
export type { HouseStyleProfile } from "./house-style";
export { composeVisualPrompt } from "./prompt-composer";
export type { VisualPromptInput, ComposedVisualPrompt } from "./prompt-composer";
export { storeVisualAsset } from "./asset-storage";
export type { AssetStorageResult } from "./asset-storage";
export {
  executeVisualGeneration,
  hasActiveVisualGeneration,
  findVisualByIdempotencyKey,
  approveVisualRequest,
  rejectVisualRequest,
  attachVisualToWork,
} from "./visual-generation-service";
export type { VisualGenerationRequest, VisualGenerationResult } from "./visual-generation-service";
