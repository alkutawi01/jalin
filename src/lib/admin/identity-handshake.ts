/**
 * Identity Handshake Service
 *
 * Internal service for registering and validating AI identity handshakes
 * against submission contributions.
 *
 * This service is PROVIDER-AGNOSTIC — it does not call any AI provider.
 * It only validates and stores identity metadata.
 *
 * SECURITY: Internal-only fields must never leak to public APIs.
 */

import type { IdentitySource, SubmissionContributions } from "../db/types";
import {
  detectProviderFamily,
  resolvePublicPersona,
  hasKnownPersona,
  isValidPublicPersona,
  type ProviderFamily,
} from "./persona-mapping";

/**
 * Identity handshake payload.
 * Accepted from generation orchestration (Phase 4D-3) or manual admin entry.
 */
export interface IdentityHandshakePayload {
  provider: string;
  model: string;
  publicPersona?: string;
  actualRole: string;
  identitySource: IdentitySource;
  runtimeVerification?: RuntimeVerification;
}

/**
 * Runtime verification metadata.
 * Populated when identity is verified at generation time.
 */
export interface RuntimeVerification {
  verifiedAt: string;
  verificationMethod: string;
  confidence: number; // 0.0 - 1.0
  notes?: string;
}

/**
 * Validated handshake result.
 * Ready for storage in submission_contributions.
 */
export interface ValidatedHandshake {
  providerFamily: ProviderFamily;
  provider: string;
  model: string;
  publicPersona: string;
  actualRole: string;
  identitySource: IdentitySource;
  runtimeVerification: RuntimeVerification | null;
  isValid: boolean;
  errors: string[];
}

/**
 * Validate an identity handshake payload.
 * Returns a validated result with errors if any.
 *
 * Does NOT call any external provider — pure validation.
 */
export function validateHandshake(payload: IdentityHandshakePayload): ValidatedHandshake {
  const errors: string[] = [];

  // Validate required fields
  if (!payload.provider || payload.provider.trim().length === 0) {
    errors.push("Provider is required.");
  }

  if (!payload.model || payload.model.trim().length === 0) {
    errors.push("Model is required.");
  }

  if (!payload.actualRole || payload.actualRole.trim().length === 0) {
    errors.push("Actual role is required for AI contributions.");
  }

  // Validate identity source
  const validSources: IdentitySource[] = [
    "runtime_verified",
    "self_reported",
    "manual",
    "unknown",
  ];
  if (!validSources.includes(payload.identitySource)) {
    errors.push(`Invalid identity source: "${payload.identitySource}". Must be one of: ${validSources.join(", ")}`);
  }

  // Detect provider family
  const providerFamily = detectProviderFamily(payload.provider);

  // Resolve public persona
  let publicPersona = payload.publicPersona ?? "";

  // If no persona provided, try to resolve from provider
  if (!publicPersona && providerFamily !== "unknown") {
    publicPersona = resolvePublicPersona(payload.provider);
  }

  // Validate persona if provided
  // Invalid persona is silently cleared — admin can correct manually
  if (publicPersona && !isValidPublicPersona(publicPersona)) {
    publicPersona = ""; // Clear invalid persona (no error — admin override available)
  }

  // Warn if unknown provider with no persona
  if (providerFamily === "unknown" && !publicPersona) {
    // This is acceptable — unknown providers get no automatic persona
  }

  // Validate runtime verification if provided
  let runtimeVerification: RuntimeVerification | null = null;
  if (payload.runtimeVerification) {
    const rv = payload.runtimeVerification;
    if (!rv.verifiedAt) {
      errors.push("Runtime verification missing verifiedAt timestamp.");
    }
    if (!rv.verificationMethod) {
      errors.push("Runtime verification missing verificationMethod.");
    }
    if (typeof rv.confidence !== "number" || rv.confidence < 0 || rv.confidence > 1) {
      errors.push("Runtime verification confidence must be between 0.0 and 1.0.");
    }
    runtimeVerification = rv;
  }

  return {
    providerFamily,
    provider: payload.provider.trim(),
    model: payload.model.trim(),
    publicPersona,
    actualRole: payload.actualRole.trim(),
    identitySource: payload.identitySource,
    runtimeVerification,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Build contribution fields from a validated handshake.
 * Returns only the fields that should be stored in submission_contributions.
 *
 * SECURITY: This is the boundary function — it determines what gets stored.
 */
export function handshakeToContributionFields(
  handshake: ValidatedHandshake
): Pick<
  SubmissionContributions,
  "ai_provider" | "ai_model" | "ai_persona" | "ai_actual_role" | "ai_identity_source"
> {
  if (!handshake.isValid) {
    throw new Error("Cannot build contribution fields from invalid handshake.");
  }

  return {
    ai_provider: handshake.provider,
    ai_model: handshake.model,
    ai_persona: handshake.publicPersona || null,
    ai_actual_role: handshake.actualRole,
    ai_identity_source: handshake.identitySource,
  };
}

/**
 * Public projection of a contribution.
 * Strips all internal AI identity fields.
 *
 * SECURITY: This is the ONLY way contribution data should be exposed publicly.
 */
export interface PublicContributionProjection {
  contributorSlug: string | null;
  guestName: string | null;
  roleKey: string | null;
  roleLabel: string;
  sortOrder: number;
  suggestedPublicCredit: string | null;
}

/**
 * Create a public-safe projection of a contribution.
 * Internal AI identity fields are NEVER included.
 */
export function toPublicProjection(
  contribution: Pick<
    SubmissionContributions,
    "contributor_slug" | "guest_name" | "role_key" | "role_label" | "sort_order" | "suggested_public_credit"
  >
): PublicContributionProjection {
  return {
    contributorSlug: contribution.contributor_slug,
    guestName: contribution.guest_name,
    roleKey: contribution.role_key,
    roleLabel: contribution.role_label,
    sortOrder: contribution.sort_order,
    suggestedPublicCredit: contribution.suggested_public_credit,
  };
}

/**
 * Admin projection of a contribution.
 * Includes ALL fields including internal AI identity.
 *
 * SECURITY: Admin-only — must be behind auth.
 */
export interface AdminContributionProjection extends PublicContributionProjection {
  id: number;
  submissionId: number;
  aiProvider: string | null;
  aiModel: string | null;
  aiPersona: string | null;
  aiActualRole: string | null;
  aiIdentitySource: IdentitySource;
  createdAt: Date | string;
}

/**
 * Create an admin-safe projection with all fields.
 */
export function toAdminProjection(
  contribution: Pick<
    SubmissionContributions,
    "id" | "submission_id" | "contributor_slug" | "guest_name" | "role_key" | "role_label" |
    "sort_order" | "suggested_public_credit" | "ai_provider" | "ai_model" | "ai_persona" |
    "ai_actual_role" | "ai_identity_source" | "created_at"
  >
): AdminContributionProjection {
  return {
    id: Number(contribution.id),
    submissionId: contribution.submission_id,
    contributorSlug: contribution.contributor_slug,
    guestName: contribution.guest_name,
    roleKey: contribution.role_key,
    roleLabel: contribution.role_label,
    sortOrder: contribution.sort_order,
    suggestedPublicCredit: contribution.suggested_public_credit,
    aiProvider: contribution.ai_provider,
    aiModel: contribution.ai_model,
    aiPersona: contribution.ai_persona,
    aiActualRole: contribution.ai_actual_role,
    aiIdentitySource: contribution.ai_identity_source,
    createdAt: contribution.created_at as unknown as Date | string,
  };
}

/**
 * Privacy check: verify that internal identity fields are NOT present
 * in a public projection.
 */
export function verifyPrivacyBoundary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projection: Record<string, any>
): { isPrivate: boolean; leakedFields: string[] } {
  const internalFields = [
    "aiProvider",
    "aiModel",
    "aiPersona",
    "aiActualRole",
    "aiIdentitySource",
    "ai_provider",
    "ai_model",
    "ai_persona",
    "ai_actual_role",
    "ai_identity_source",
  ];

  const leakedFields = internalFields.filter((field) => field in projection);

  return {
    isPrivate: leakedFields.length === 0,
    leakedFields,
  };
}
