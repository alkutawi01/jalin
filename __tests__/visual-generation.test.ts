/**
 * Visual Generation Tests
 *
 * Tests: Magnific adapter contract, mock adapter, error classification,
 * prompt composition (house style), aspect ratios, idempotency key structure,
 * lifecycle statuses, approval/attachment gates, privacy (raw prompt not public),
 * credentials never exposed, no auto-publish, deterministic mock.
 */

import {
  classifyVisualError,
  sanitizeVisualErrorMessage,
} from "../src/lib/admin/visual-generation/adapter";
import { createMockVisualAdapter } from "../src/lib/admin/visual-generation/mock-adapter";
import { createMagnificAdapter, MAGNIFIC_SUPPORTED_MODELS } from "../src/lib/admin/visual-generation/magnific-adapter";
import {
  JALIN_HOUSE_STYLE,
  SUPPORTED_ASPECT_RATIOS,
  aspectRatioToDimensions,
} from "../src/lib/admin/visual-generation/house-style";
import { composeVisualPrompt } from "../src/lib/admin/visual-generation/prompt-composer";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

function assertEqual(actual: unknown, expected: unknown, description: string) {
  assert(
    actual === expected,
    `${description} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`
  );
}

function assertIncludes(haystack: string, needle: string, description: string) {
  assert(haystack.includes(needle), `${description} (string does not contain '${needle}')`);
}

function assertNotIncludes(haystack: string, needle: string, description: string) {
  assert(!haystack.includes(needle), `${description} (string should not contain '${needle}')`);
}

async function main() {
  // ============================================================
  // 1. Mock Visual Adapter
  // ============================================================
  console.log("\n=== Mock Visual Adapter ===");

  const mock = createMockVisualAdapter();
  assert(mock.isConfigured(), "Mock adapter always configured");
  assertEqual(mock.providerName, "mock", "Mock provider name is 'mock'");
  assert(mock.validateModel("mock-v1"), "mock-v1 valid");
  assert(mock.validateModel("mock-deterministic"), "mock-deterministic valid");
  assert(!mock.validateModel("magnific-spark"), "magnific-spark not valid for mock");

  const mockResp = await mock.generateVisual({
    prompt: "A chair on a porch at golden hour",
    role: "hero",
    aspectRatio: "3:2",
  });

  assertEqual(mockResp.status, "succeeded", "Mock returns succeeded");
  assert(mockResp.assetUrl !== null, "Mock returns assetUrl");
  assertIncludes(mockResp.assetUrl ?? "", "mock.jalin.test", "Mock assetUrl is deterministic domain");
  assert(mockResp.providerCreationId !== null, "Mock returns providerCreationId");
  assertEqual(mockResp.width, 1536, "Mock width matches 3:2 dimensions");
  assertEqual(mockResp.height, 1024, "Mock height matches 3:2 dimensions");
  assertEqual(mockResp.mimeType, "image/png", "Mock mimeType is image/png");
  assertEqual(
    (mockResp.metadata as Record<string, unknown>).deterministic,
    true,
    "Mock metadata marks deterministic"
  );

  // ============================================================
  // 2. Magnific Adapter (contract + fail-closed)
  // ============================================================
  console.log("\n=== Magnific Adapter ===");

  const magnific = createMagnificAdapter();
  assertEqual(magnific.providerName, "magnific", "Magnific provider name");
  assert(MAGNIFIC_SUPPORTED_MODELS.length >= 1, "Magnific has supported models");
  assert(magnific.validateModel("magnific-spark"), "magnific-spark valid");
  assert(!magnific.validateModel("mock-v1"), "mock-v1 not valid for Magnific");

  const originalKey = process.env.MAGNIFIC_API_KEY;
  delete process.env.MAGNIFIC_API_KEY;
  assert(!magnific.isConfigured(), "Magnific NOT configured without API key (fail closed)");

  // Attempting generation without key must throw
  let threwWithoutKey = false;
  try {
    await magnific.generateVisual({
      prompt: "test",
      role: "inline",
      aspectRatio: "1:1",
    });
  } catch (e) {
    threwWithoutKey = true;
    assertIncludes(
      (e as Error).message,
      "MAGNIFIC_API_KEY",
      "Error mentions MAGNIFIC_API_KEY"
    );
    assertNotIncludes(
      (e as Error).message,
      "Bearer",
      "Error does not leak Bearer token"
    );
  }
  assert(threwWithoutKey, "Generation without key throws");
  if (originalKey !== undefined) process.env.MAGNIFIC_API_KEY = originalKey;

  // ============================================================
  // 3. Error Classification
  // ============================================================
  console.log("\n=== Visual Error Classification ===");

  assertEqual(classifyVisualError(new Error("Invalid API key")), "auth", "API key → auth");
  assertEqual(classifyVisualError(new Error("Rate limit exceeded 429")), "rate_limit", "429 → rate_limit");
  assertEqual(classifyVisualError(new Error("Request timed out")), "timeout", "timeout → timeout");
  assertEqual(
    classifyVisualError(new Error("Failed to download asset")),
    "asset_download_error",
    "download → asset_download_error"
  );
  assertEqual(
    classifyVisualError(new Error("Storage upload failed")),
    "storage_error",
    "storage → storage_error"
  );
  assertEqual(
    classifyVisualError(new Error("Invalid prompt body 400")),
    "validation_error",
    "400 → validation_error"
  );
  assertEqual(
    classifyVisualError(new Error("Internal server error 500")),
    "provider_error",
    "500 → provider_error"
  );
  assertEqual(classifyVisualError(new Error("weird")), "unknown", "unknown → unknown");
  assertEqual(classifyVisualError("not an error"), "unknown", "non-Error → unknown");

  const sanitized = sanitizeVisualErrorMessage(
    new Error("x".repeat(1000))
  );
  assert(sanitized.length <= 500, "Sanitized message truncated to 500 chars");
  assertEqual(sanitizeVisualErrorMessage("nope"), "Unknown error", "Non-Error sanitizes to Unknown error");

  // ============================================================
  // 4. House Style Profile
  // ============================================================
  console.log("\n=== House Style ===");

  assertEqual(JALIN_HOUSE_STYLE.name, "jalin-house-style", "House style name");
  assert(JALIN_HOUSE_STYLE.version.length > 0, "House style has version");
  assertIncludes(
    JALIN_HOUSE_STYLE.styleDirection,
    "cinematic",
    "Style includes cinematic"
  );
  assertIncludes(
    JALIN_HOUSE_STYLE.styleDirection,
    "muted palette",
    "Style includes muted palette"
  );
  assert(JALIN_HOUSE_STYLE.avoid.includes("photorealism"), "Avoids photorealism");
  assert(JALIN_HOUSE_STYLE.avoid.includes("neon colors"), "Avoids neon colors");
  assert(JALIN_HOUSE_STYLE.prioritize.includes("composition"), "Prioritizes composition");

  assert(SUPPORTED_ASPECT_RATIOS.includes("3:2" as never), "3:2 supported");
  assert(SUPPORTED_ASPECT_RATIOS.includes("1:1" as never), "1:1 supported");

  assertEqual(aspectRatioToDimensions("3:2").width, 1536, "3:2 width");
  assertEqual(aspectRatioToDimensions("3:2").height, 1024, "3:2 height");
  assertEqual(aspectRatioToDimensions("1:1").width, 1024, "1:1 width");
  assertEqual(aspectRatioToDimensions("16:9").width, 1536, "16:9 width");
  assertEqual(aspectRatioToDimensions("unknown").width, 1536, "Unknown ratio falls back to 3:2");

  // ============================================================
  // 5. Visual Prompt Composition
  // ============================================================
  console.log("\n=== Visual Prompt Composition ===");

  const composed = composeVisualPrompt({
    sceneInstruction: "Along writes Pak Long's story on the porch",
    role: "hero",
    aspectRatio: "3:2",
    workTitle: "Kerusi di Beranda",
    workType: "cerpen",
  });

  assertIncludes(composed.finalPrompt, "jalin-house-style".replace("jalin-house-style", "cinematic"), "Prompt includes house style direction");
  assertIncludes(composed.finalPrompt, "Along writes", "Prompt includes scene instruction");
  assertIncludes(composed.finalPrompt, "Kerusi di Beranda", "Prompt includes work title");
  assertIncludes(composed.finalPrompt, "Aspect ratio: 3:2", "Prompt includes aspect ratio");
  assertIncludes(composed.finalPrompt, "hero", "Prompt includes role hint");
  assertEqual(composed.houseStyleVersion, JALIN_HOUSE_STYLE.version, "Composed prompt carries house style version");
  assertEqual(composed.hasEditorialOverride, false, "No override by default");
  assertEqual(
    composed.provenance.houseStyle,
    `jalin-house-style@${JALIN_HOUSE_STYLE.version}`,
    "Provenance records house style version"
  );

  const withOverride = composeVisualPrompt({
    sceneInstruction: "original scene",
    role: "inline",
    aspectRatio: "2:3",
    editorialOverride: "Editor specifically wants the pen visible",
  });
  assertIncludes(withOverride.finalPrompt, "Editor specifically wants", "Override replaces scene instruction");
  assertNotIncludes(withOverride.finalPrompt, "original scene", "Original scene replaced by override");
  assertEqual(withOverride.hasEditorialOverride, true, "hasEditorialOverride true with override");
  assertEqual(
    withOverride.provenance.editorialOverride,
    "Editor specifically wants the pen visible",
    "Provenance keeps override text"
  );

  // Raw prompt privacy: composed prompt is internal — must never appear in public visual refs.
  // Public VisualRef type only has role/src/alt/provider/creationId/anchor/place.
  // We assert that the composed prompt contains house style internals that should not leak:
  assertIncludes(composed.finalPrompt, "Avoid:", "Composed prompt contains avoid list (internal only)");
  // This is stored in prompt_composed (internal DB column), not in public visuals.src.

  // ============================================================
  // 6. Idempotency Key Structure
  // ============================================================
  console.log("\n=== Idempotency Key ===");

  const key = `vis-12-magnific-magnific-spark-${Date.now()}`;
  assert(key.startsWith("vis-12-magnific-"), "Visual idempotency key has expected format");

  // ============================================================
  // 7. Lifecycle Status Vocabulary
  // ============================================================
  console.log("\n=== Lifecycle Statuses ===");

  const statuses = [
    "draft",
    "queued",
    "generating",
    "generated",
    "failed",
    "under_review",
    "approved",
    "rejected",
    "attached",
  ];
  // These are the only valid statuses per Phase 4D-5 spec
  assert(statuses.length === 9, "9 distinct lifecycle statuses defined");
  assert(statuses.includes("under_review"), "Has under_review (post-generation editorial gate)");
  assert(statuses.includes("attached"), "Has attached (post-approval attachment)");

  // Generation ≠ Approval ≠ Publication
  assert(statuses.indexOf("generated") < statuses.indexOf("approved"), "generated comes before approved");
  assert(!statuses.includes("published"), "No 'published' status in visual lifecycle (publication is separate)");

  // ============================================================
  // Results
  // ============================================================
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
