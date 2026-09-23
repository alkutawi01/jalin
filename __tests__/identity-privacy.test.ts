/**
 * Phase 4D-2 Identity & Privacy Tests
 *
 * Tests for:
 * - Identity handshake validation
 * - Persona mapping
 * - Privacy boundary (internal fields never leak to public APIs)
 * - Suggested credit is not auto-final
 * - Human/guest contributions unaffected
 *
 * Run: npx tsx __tests__/identity-privacy.test.ts
 */

import {
  validateHandshake,
  toPublicProjection,
  toAdminProjection,
  verifyPrivacyBoundary,
  type IdentityHandshakePayload,
} from "../src/lib/admin/identity-handshake";

import {
  detectProviderFamily,
  resolvePublicPersona,
  hasKnownPersona,
  isValidPublicPersona,
  listPersonaMappings,
} from "../src/lib/admin/persona-mapping";

import { SUGGESTED_CREDIT_BOUNDARY } from "../src/lib/admin/contribution-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message} — expected "${expected}", got "${actual}"`);
  }
}

// ============================================================
// Test 1: Persona Mapping
// ============================================================
console.log("\n=== Persona Mapping ===");

assertEqual(detectProviderFamily("openai"), "openai", "detectProviderFamily('openai') → openai");
assertEqual(detectProviderFamily("anthropic"), "anthropic", "detectProviderFamily('anthropic') → anthropic");
assertEqual(detectProviderFamily("mimo"), "mimo", "detectProviderFamily('mimo') → mimo");
assertEqual(detectProviderFamily("opencode"), "opencode", "detectProviderFamily('opencode') → opencode");
assertEqual(detectProviderFamily("unknown_vendor"), "unknown", "detectProviderFamily('unknown_vendor') → unknown");
assertEqual(detectProviderFamily(null), "unknown", "detectProviderFamily(null) → unknown");
assertEqual(detectProviderFamily(""), "unknown", "detectProviderFamily('') → unknown");

assertEqual(resolvePublicPersona("openai"), "Rafiq Naim", "resolvePublicPersona('openai') → 'Rafiq Naim'");
assertEqual(resolvePublicPersona("anthropic"), "Nara Zahin", "resolvePublicPersona('anthropic') → 'Nara Zahin'");
assertEqual(resolvePublicPersona("mimo"), "Amir Syafiq", "resolvePublicPersona('mimo') → 'Amir Syafiq'");
assertEqual(resolvePublicPersona("opencode"), "Amir Syafiq", "resolvePublicPersona('opencode') → 'Amir Syafiq'");
assertEqual(resolvePublicPersona("unknown_vendor"), "", "resolvePublicPersona('unknown_vendor') → ''");

assert(hasKnownPersona("openai"), "hasKnownPersona('openai') → true");
assert(hasKnownPersona("anthropic"), "hasKnownPersona('anthropic') → true");
assert(!hasKnownPersona("unknown_vendor"), "hasKnownPersona('unknown_vendor') → false");

assert(isValidPublicPersona("Rafiq Naim"), "isValidPublicPersona('Rafiq Naim') → true");
assert(isValidPublicPersona("Nara Zahin"), "isValidPublicPersona('Nara Zahin') → true");
assert(!isValidPublicPersona("OpenAI Assistant"), "isValidPublicPersona('OpenAI Assistant') → false (contains 'openai')");
assert(!isValidPublicPersona("GPT-4 Writer"), "isValidPublicPersona('GPT-4 Writer') → false (contains 'gpt-4')");
assert(!isValidPublicPersona(""), "isValidPublicPersona('') → false");
assert(!isValidPublicPersona("   "), "isValidPublicPersona('   ') → false");

const mappings = listPersonaMappings();
assert(mappings.length >= 4, `listPersonaMappings() returns ≥ 4 entries (got ${mappings.length})`);

// ============================================================
// Test 2: Identity Handshake Validation
// ============================================================
console.log("\n=== Identity Handshake Validation ===");

// Valid OpenAI handshake
const validOpenAI: IdentityHandshakePayload = {
  provider: "openai",
  model: "gpt-4",
  publicPersona: "Rafiq Naim",
  actualRole: "draft_writer",
  identitySource: "runtime_verified",
};

const result1 = validateHandshake(validOpenAI);
assert(result1.isValid, "Valid OpenAI handshake → isValid");
assertEqual(result1.providerFamily, "openai", "OpenAI handshake → providerFamily 'openai'");
assertEqual(result1.publicPersona, "Rafiq Naim", "OpenAI handshake → publicPersona 'Rafiq Naim'");
assertEqual(result1.identitySource, "runtime_verified", "OpenAI handshake → identitySource 'runtime_verified'");

// Valid Anthropic handshake
const validAnthropic: IdentityHandshakePayload = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  publicPersona: "Nara Zahin",
  actualRole: "draft_writer",
  identitySource: "runtime_verified",
};

const result2 = validateHandshake(validAnthropic);
assert(result2.isValid, "Valid Anthropic handshake → isValid");
assertEqual(result2.publicPersona, "Nara Zahin", "Anthropic handshake → publicPersona 'Nara Zahin'");

// Unknown provider — no false persona
const unknownProvider: IdentityHandshakePayload = {
  provider: "some_new_vendor",
  model: "model-v1",
  actualRole: "draft_writer",
  identitySource: "self_reported",
};

const result3 = validateHandshake(unknownProvider);
assert(result3.isValid, "Unknown provider handshake → isValid (no false persona)");
assertEqual(result3.publicPersona, "", "Unknown provider → publicPersona '' (no false persona)");
assertEqual(result3.providerFamily, "unknown", "Unknown provider → providerFamily 'unknown'");

// Missing required fields
const missingProvider: IdentityHandshakePayload = {
  provider: "",
  model: "gpt-4",
  actualRole: "draft_writer",
  identitySource: "runtime_verified",
};

const result4 = validateHandshake(missingProvider);
assert(!result4.isValid, "Missing provider → !isValid");
assert(result4.errors.some((e) => e.includes("Provider")), "Missing provider error mentions 'Provider'");

const missingModel: IdentityHandshakePayload = {
  provider: "openai",
  model: "",
  actualRole: "draft_writer",
  identitySource: "runtime_verified",
};

const result5 = validateHandshake(missingModel);
assert(!result5.isValid, "Missing model → !isValid");

const missingRole: IdentityHandshakePayload = {
  provider: "openai",
  model: "gpt-4",
  actualRole: "",
  identitySource: "runtime_verified",
};

const result6 = validateHandshake(missingRole);
assert(!result6.isValid, "Missing actualRole → !isValid");

// Invalid identity source
const invalidSource: IdentityHandshakePayload = {
  provider: "openai",
  model: "gpt-4",
  actualRole: "draft_writer",
  identitySource: "invalid_source" as any,
};

const result7 = validateHandshake(invalidSource);
assert(!result7.isValid, "Invalid identitySource → !isValid");
assert(result7.errors.some((e) => e.includes("identity source")), "Error mentions 'identity source'");

// Invalid persona (contains provider keyword)
const invalidPersona: IdentityHandshakePayload = {
  provider: "openai",
  model: "gpt-4",
  publicPersona: "OpenAI Writer",
  actualRole: "draft_writer",
  identitySource: "runtime_verified",
};

const result8 = validateHandshake(invalidPersona);
assert(result8.isValid, "Invalid persona still valid (cleared, not error)");
assertEqual(result8.publicPersona, "", "Invalid persona cleared to ''");

// ============================================================
// Test 3: Privacy Boundary
// ============================================================
console.log("\n=== Privacy Boundary ===");

// Public projection strips internal fields
const mockContribution = {
  id: 1,
  submission_id: 1,
  contributor_slug: null,
  guest_name: null,
  role_key: "writer",
  role_label: "Penulis",
  sort_order: 1,
  suggested_public_credit: "Rafiq Naim — Penulis",
  ai_provider: "openai",
  ai_model: "gpt-4",
  ai_persona: "Rafiq Naim",
  ai_actual_role: "draft_writer",
  ai_identity_source: "runtime_verified" as const,
  created_at: new Date(),
};

const publicProj = toPublicProjection(mockContribution);
const privacyCheck = verifyPrivacyBoundary(publicProj);
assert(privacyCheck.isPrivate, "Public projection has no internal fields");
assertEqual(privacyCheck.leakedFields.length, 0, "Public projection leakedFields is empty");

// Verify specific fields are absent
assert(!("aiProvider" in publicProj), "Public projection has no aiProvider");
assert(!("aiModel" in publicProj), "Public projection has no aiModel");
assert(!("aiPersona" in publicProj), "Public projection has no aiPersona");
assert(!("aiActualRole" in publicProj), "Public projection has no aiActualRole");
assert(!("aiIdentitySource" in publicProj), "Public projection has no aiIdentitySource");

// Verify specific fields are present
assertEqual(publicProj.roleLabel, "Penulis", "Public projection has roleLabel");
assertEqual(publicProj.suggestedPublicCredit, "Rafiq Naim — Penulis", "Public projection has suggestedPublicCredit");

// Admin projection includes internal fields
const adminProj = toAdminProjection(mockContribution);
assertEqual(adminProj.aiProvider, "openai", "Admin projection has aiProvider");
assertEqual(adminProj.aiModel, "gpt-4", "Admin projection has aiModel");
assertEqual(adminProj.aiPersona, "Rafiq Naim", "Admin projection has aiPersona");
assertEqual(adminProj.aiActualRole, "draft_writer", "Admin projection has aiActualRole");
assertEqual(adminProj.aiIdentitySource, "runtime_verified", "Admin projection has aiIdentitySource");

// Detect leaked fields in bad projection
const badProjection = {
  roleLabel: "Penulis",
  aiProvider: "openai", // leaked!
  aiModel: "gpt-4", // leaked!
};
const badCheck = verifyPrivacyBoundary(badProjection);
assert(!badCheck.isPrivate, "Bad projection detected as NOT private");
assert(badCheck.leakedFields.includes("aiProvider"), "Bad projection leaked aiProvider");
assert(badCheck.leakedFields.includes("aiModel"), "Bad projection leaked aiModel");

// ============================================================
// Test 4: Human/Guest Contributions Unaffected
// ============================================================
console.log("\n=== Human/Guest Contributions ===");

// Human contribution — no AI fields needed
const humanContribution = {
  id: 2,
  submission_id: 1,
  contributor_slug: "izzat-anas",
  guest_name: null,
  role_key: "editor",
  role_label: "Penyunting",
  sort_order: 2,
  suggested_public_credit: "Izzat Anas — Penyunting",
  ai_provider: null,
  ai_model: null,
  ai_persona: null,
  ai_actual_role: null,
  ai_identity_source: "unknown" as const,
  created_at: new Date(),
};

const humanPublic = toPublicProjection(humanContribution);
const humanPrivacy = verifyPrivacyBoundary(humanPublic);
assert(humanPrivacy.isPrivate, "Human contribution public projection is private");
assertEqual(humanPublic.contributorSlug, "izzat-anas", "Human contribution has contributorSlug");
assertEqual(humanPublic.roleLabel, "Penyunting", "Human contribution has roleLabel");

// Guest contribution — no AI fields needed
const guestContribution = {
  id: 3,
  submission_id: 1,
  contributor_slug: null,
  guest_name: "Prof. Ahmad",
  role_key: "reviewer",
  role_label: "Penyemak Fakta",
  sort_order: 3,
  suggested_public_credit: "Prof. Ahmad — Penyemak Fakta",
  ai_provider: null,
  ai_model: null,
  ai_persona: null,
  ai_actual_role: null,
  ai_identity_source: "unknown" as const,
  created_at: new Date(),
};

const guestPublic = toPublicProjection(guestContribution);
const guestPrivacy = verifyPrivacyBoundary(guestPublic);
assert(guestPrivacy.isPrivate, "Guest contribution public projection is private");
assertEqual(guestPublic.guestName, "Prof. Ahmad", "Guest contribution has guestName");

// ============================================================
// Test 5: Suggested Credit Boundary
// ============================================================
console.log("\n=== Suggested Credit Boundary ===");

assert(SUGGESTED_CREDIT_BOUNDARY.enforced, "Suggested credit boundary is enforced");
assert(
  SUGGESTED_CREDIT_BOUNDARY.description.includes("does NOT"),
  "Suggested credit boundary description states 'does NOT'"
);
assert(
  SUGGESTED_CREDIT_BOUNDARY.description.includes("Admin must explicitly confirm"),
  "Suggested credit boundary requires admin confirmation"
);

// ============================================================
// Summary
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
