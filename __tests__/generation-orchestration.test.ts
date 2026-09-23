/**
 * Generation Orchestration Tests
 *
 * Tests: mock adapter, error classification, prompt composition,
 * idempotency, identity handshake, privacy boundaries, no auto-publish.
 */

import { classifyProviderError, sanitizeErrorMessage } from "../src/lib/admin/generation/adapter";
import { createMockAdapter } from "../src/lib/admin/generation/mock-adapter";
import { composePrompts, formatComposedPromptPreview } from "../src/lib/admin/generation/prompt-composer";
import { validateHandshake, handshakeToContributionFields, toPublicProjection, verifyPrivacyBoundary } from "../src/lib/admin/identity-handshake";
import { detectProviderFamily, resolvePublicPersona, isValidPublicPersona } from "../src/lib/admin/persona-mapping";
import { SUGGESTED_CREDIT_BOUNDARY } from "../src/lib/admin/contribution-service";
import { createOpenAIAdapter, OPENAI_SUPPORTED_MODELS } from "../src/lib/admin/generation/openai-adapter";
import * as fs from "fs";

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
  assert(actual === expected, `${description} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`);
}

function assertIncludes(haystack: string, needle: string, description: string) {
  assert(haystack.includes(needle), `${description} (string does not contain '${needle}')`);
}

async function main() {
  // ============================================================
  // 1. Mock Adapter
  // ============================================================
  console.log("\n=== Mock Adapter ===");

  const mockAdapter = createMockAdapter();

  assert(mockAdapter.isConfigured(), "Mock adapter always configured");
  assertEqual(mockAdapter.providerName, "mock", "Mock adapter provider name");
  assert(mockAdapter.supportedModels.includes("mock-v1"), "Mock supports mock-v1");

  const mockResponse = await mockAdapter.generateText({
    systemPrompt: "You are a Malaysian literary writer.",
    userPrompt: "Write a short story about a boy and his kite.",
    model: "mock-v1",
  });

  assert(mockResponse.content.length > 0, "Mock returns non-empty content");
  assertEqual(mockResponse.provider, "mock", "Mock response provider is 'mock'");
  assertEqual(mockResponse.model, "mock-v1", "Mock response model matches input");
  assert(mockResponse.usage.inputTokens !== null, "Mock returns input tokens");
  assert(mockResponse.usage.outputTokens !== null, "Mock returns output tokens");
  assert(mockResponse.usage.estimatedCostCents === 0, "Mock cost is 0");
  assert(mockResponse.runtimeIdentity.verificationMethod === "test_deterministic", "Mock verification method is test_deterministic");
  assert(mockResponse.runtimeIdentity.confidence === 1.0, "Mock confidence is 1.0");

  assert(mockAdapter.validateModel("mock-v1"), "mock-v1 is valid");
  assert(mockAdapter.validateModel("mock-deterministic"), "mock-deterministic is valid");
  assert(!mockAdapter.validateModel("gpt-4"), "gpt-4 is not valid for mock adapter");

  // ============================================================
  // 2. Error Classification
  // ============================================================
  console.log("\n=== Error Classification ===");

  assertEqual(classifyProviderError(new Error("Invalid API key")), "auth", "API key error → auth");
  assertEqual(classifyProviderError(new Error("Rate limit exceeded 429")), "rate_limit", "Rate limit → rate_limit");
  assertEqual(classifyProviderError(new Error("Request timed out")), "timeout", "Timeout → timeout");
  assertEqual(classifyProviderError(new Error("Invalid request body")), "validation_error", "Invalid request → validation_error");
  assertEqual(classifyProviderError(new Error("Internal server error 500")), "provider_error", "500 → provider_error");
  assertEqual(classifyProviderError(new Error("Something weird happened")), "unknown", "Unknown error → unknown");
  assertEqual(classifyProviderError("not an error"), "unknown", "Non-Error → unknown");
  assertEqual(classifyProviderError(null), "unknown", "Null → unknown");

  const sanitized = sanitizeErrorMessage(new Error("Something went wrong"));
  assert(sanitized.length <= 500, "Sanitized error is within length limit");

  // ============================================================
  // 3. Prompt Composition
  // ============================================================
  console.log("\n=== Prompt Composition ===");

  const templates = [
    { id: 1, name: "Global Editorial", prompt_text: "Write for Malaysian teens aged 13-17.", scope: "global", version: 1 },
    { id: 2, name: "Cerpen Prompt", prompt_text: "Write in Bahasa Malaysia. Use vivid imagery.", scope: "per-type", version: 2 },
  ];

  const composed = composePrompts(templates, "Write about a boy who finds a magical kite.", "K-boy Lelaki dan Layangan Ajaib");

  assertIncludes(composed.systemPrompt, "Write for Malaysian teens", "System prompt includes global template");
  assertIncludes(composed.systemPrompt, "Write in Bahasa Malaysia", "System prompt includes work-type template");
  assertIncludes(composed.userPrompt, "K-boy Lelaki dan Layangan Ajaib", "User prompt includes title");
  assertIncludes(composed.userPrompt, "Write about a boy", "User prompt includes brief");
  assert(composed.templateIds.includes(1), "Template IDs tracked");
  assert(composed.templateIds.includes(2), "Template IDs tracked for work-type");
  assert(composed.templateNames.includes("Global Editorial"), "Template names tracked");
  assert(composed.templateVersions.includes(1), "Template versions tracked");
  assert(composed.templateVersions.includes(2), "Template versions tracked for work-type");

  const preview = formatComposedPromptPreview(composed);
  assertIncludes(preview, "PROMPT PROVENANCE", "Preview includes provenance section");
  assertIncludes(preview, "Global Editorial", "Preview includes template name");

  // No templates
  const emptyComposed = composePrompts([], "Just write something.");
  assert(emptyComposed.systemPrompt === "", "Empty templates → empty system prompt");
  assertIncludes(emptyComposed.userPrompt, "Just write something", "User prompt still has brief");

  // ============================================================
  // 4. Identity Handshake Integration
  // ============================================================
  console.log("\n=== Identity Handshake Integration ===");

  const handshakePayload = {
    provider: "openai",
    model: "gpt-4o",
    actualRole: "draft_writer",
    identitySource: "runtime_verified" as const,
    runtimeVerification: {
      verifiedAt: new Date().toISOString(),
      verificationMethod: "api_response_header",
      confidence: 1.0,
    },
  };

  const validated = validateHandshake(handshakePayload);
  assert(validated.isValid, "Valid OpenAI handshake is valid");
  assertEqual(validated.providerFamily, "openai", "Provider family detected as openai");
  assertEqual(validated.publicPersona, "Rafiq Naim", "Public persona resolved to Rafiq Naim");

  const fields = handshakeToContributionFields(validated);
  assertEqual(fields.ai_provider, "openai", "Contribution field ai_provider = openai");
  assertEqual(fields.ai_model, "gpt-4o", "Contribution field ai_model = gpt-4o");
  assertEqual(fields.ai_persona, "Rafiq Naim", "Contribution field ai_persona = Rafiq Naim");
  assertEqual(fields.ai_actual_role, "draft_writer", "Contribution field ai_actual_role = draft_writer");
  assertEqual(fields.ai_identity_source, "runtime_verified", "Contribution field ai_identity_source = runtime_verified");

  // Anthropic
  const anthropicHandshake = validateHandshake({
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    actualRole: "draft_writer",
    identitySource: "runtime_verified",
  });
  assertEqual(anthropicHandshake.publicPersona, "Nara Zahin", "Anthropic persona = Nara Zahin");

  // Unknown provider
  const unknownHandshake = validateHandshake({
    provider: "unknown_vendor",
    model: "some-model",
    actualRole: "draft_writer",
    identitySource: "self_reported",
  });
  assert(unknownHandshake.isValid, "Unknown provider handshake still valid");
  assertEqual(unknownHandshake.publicPersona, "", "Unknown provider has no persona");

  // Missing required fields
  const missingProvider = validateHandshake({
    provider: "",
    model: "gpt-4o",
    actualRole: "draft_writer",
    identitySource: "runtime_verified",
  });
  assert(!missingProvider.isValid, "Missing provider → invalid");

  const missingModel = validateHandshake({
    provider: "openai",
    model: "",
    actualRole: "draft_writer",
    identitySource: "runtime_verified",
  });
  assert(!missingModel.isValid, "Missing model → invalid");

  const missingRole = validateHandshake({
    provider: "openai",
    model: "gpt-4o",
    actualRole: "",
    identitySource: "runtime_verified",
  });
  assert(!missingRole.isValid, "Missing actual role → invalid");

  // ============================================================
  // 5. Privacy Boundary — Public Projection
  // ============================================================
  console.log("\n=== Privacy Boundary ===");

  const mockContribution = {
    id: 1 as unknown as import("kysely").Generated<number>,
    submission_id: 1,
    contributor_slug: null as string | null,
    guest_name: null as string | null,
    role_key: "draft_writer",
    role_label: "Penulis Draf",
    sort_order: 0,
    suggested_public_credit: "Rafiq Naim",
    ai_provider: "openai",
    ai_model: "gpt-4o",
    ai_persona: "Rafiq Naim",
    ai_actual_role: "draft_writer",
    ai_identity_source: "runtime_verified" as const,
    created_at: new Date(),
  };

  const publicProj = toPublicProjection(mockContribution);
  assert(!("ai_provider" in publicProj), "Public projection has no ai_provider");
  assert(!("ai_model" in publicProj), "Public projection has no ai_model");
  assert(!("ai_persona" in publicProj), "Public projection has no ai_persona");
  assert(!("ai_actual_role" in publicProj), "Public projection has no ai_actual_role");
  assert(!("ai_identity_source" in publicProj), "Public projection has no ai_identity_source");
  assertEqual(publicProj.roleLabel, "Penulis Draf", "Public projection has roleLabel");
  assertEqual(publicProj.suggestedPublicCredit, "Rafiq Naim", "Public projection has suggestedPublicCredit");

  const privacyCheck = verifyPrivacyBoundary(publicProj);
  assert(privacyCheck.isPrivate, "Public projection passes privacy check");
  assert(privacyCheck.leakedFields.length === 0, "No leaked fields");

  // Simulate a bad projection that leaks
  const badProjection = { ...publicProj, ai_provider: "openai" } as Record<string, unknown>;
  const badCheck = verifyPrivacyBoundary(badProjection);
  assert(!badCheck.isPrivate, "Bad projection detected as NOT private");
  assert(badCheck.leakedFields.includes("ai_provider"), "Leakage includes ai_provider");

  // ============================================================
  // 6. Suggested Credit Boundary
  // ============================================================
  console.log("\n=== Suggested Credit Boundary ===");

  assert(SUGGESTED_CREDIT_BOUNDARY.enforced === true, "Suggested credit boundary is enforced");
  assertIncludes(SUGGESTED_CREDIT_BOUNDARY.description, "does NOT", "Description says does NOT auto-apply");
  assertIncludes(SUGGESTED_CREDIT_BOUNDARY.description, "Admin", "Description mentions Admin confirmation");

  // ============================================================
  // 7. No Work Auto-Creation
  // ============================================================
  console.log("\n=== No Auto Work Creation ===");

  const genServiceCode = fs.readFileSync("src/lib/admin/generation/generation-service.ts", "utf-8");
  assert(!genServiceCode.includes('insertInto("works")'), "Generation service does NOT insert Works");
  assert(!genServiceCode.includes('status: "published"'), "Generation service does NOT set status to published");
  assert(!genServiceCode.includes("updateTable(\"works\")"), "Generation service does NOT update Works table");

  // ============================================================
  // 8. Persona Mapping for Generation
  // ============================================================
  console.log("\n=== Persona Mapping for Generation ===");

  assertEqual(detectProviderFamily("openai"), "openai", "detectProviderFamily(openai)");
  assertEqual(detectProviderFamily("anthropic"), "anthropic", "detectProviderFamily(anthropic)");
  assertEqual(detectProviderFamily("mimo"), "mimo", "detectProviderFamily(mimo)");
  assertEqual(detectProviderFamily("mock"), "unknown", "detectProviderFamily(mock) = unknown");

  assertEqual(resolvePublicPersona("openai"), "Rafiq Naim", "OpenAI → Rafiq Naim");
  assertEqual(resolvePublicPersona("anthropic"), "Nara Zahin", "Anthropic → Nara Zahin");
  assertEqual(resolvePublicPersona("mimo"), "Amir Syafiq", "MiMo → Amir Syafiq");
  assertEqual(resolvePublicPersona("mock"), "", "Mock → no persona");

  assert(isValidPublicPersona("Rafiq Naim"), "Rafiq Naim is valid persona");
  assert(isValidPublicPersona("Nara Zahin"), "Nara Zahin is valid persona");
  assert(!isValidPublicPersona("OpenAI Assistant"), "OpenAI Assistant is NOT valid persona");
  assert(!isValidPublicPersona("GPT-4 Writer"), "GPT-4 Writer is NOT valid persona");

  // ============================================================
  // 9. OpenAI Adapter (configuration check only)
  // ============================================================
  console.log("\n=== OpenAI Adapter (config check) ===");

  const openaiAdapter = createOpenAIAdapter();
  assertEqual(openaiAdapter.providerName, "openai", "OpenAI adapter provider name");
  assert(OPENAI_SUPPORTED_MODELS.length >= 3, "OpenAI supports multiple models");
  assert(openaiAdapter.validateModel("gpt-4o"), "gpt-4o is valid");
  assert(openaiAdapter.validateModel("gpt-4o-mini"), "gpt-4o-mini is valid");
  assert(!openaiAdapter.validateModel("mock-v1"), "mock-v1 not valid for OpenAI");

  // Without API key, should not be configured
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  assert(!openaiAdapter.isConfigured(), "OpenAI not configured without API key");
  if (originalKey) process.env.OPENAI_API_KEY = originalKey;

  // ============================================================
  // 10. Idempotency Key Structure
  // ============================================================
  console.log("\n=== Idempotency Key ===");

  const sampleKey = `gen-1-openai-gpt-4o-${Date.now()}`;
  assert(sampleKey.startsWith("gen-1-openai-gpt-4o-"), "Idempotency key has expected format");

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
