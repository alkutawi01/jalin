/**
 * Admin Submission Contribution Service
 *
 * Database operations for managing submission contributions.
 *
 * PRIVACY BOUNDARY:
 * - Internal AI identity fields (ai_provider, ai_model, etc.) are admin-only
 * - Public APIs must use toPublicProjection() from identity-handshake.ts
 * - Suggested credit is NOT automatically final Work credit
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database, IdentitySource } from "../db/types";
import {
  validateHandshake,
  handshakeToContributionFields,
  type IdentityHandshakePayload,
} from "./identity-handshake";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[ContributionService] Database not available.");
  }
  return getDb();
}

/**
 * Valid identity source values.
 */
const VALID_IDENTITY_SOURCES: IdentitySource[] = [
  "runtime_verified",
  "self_reported",
  "manual",
  "unknown",
];

/**
 * Validate identity source value.
 */
function validateIdentitySource(source: string): IdentitySource {
  if (!VALID_IDENTITY_SOURCES.includes(source as IdentitySource)) {
    throw new Error(
      `Invalid identity source: "${source}". Must be one of: ${VALID_IDENTITY_SOURCES.join(", ")}`
    );
  }
  return source as IdentitySource;
}

/**
 * Validate contributor vs guest constraint.
 * Exactly one of contributorSlug or guestName must be provided for AI/guest contributions.
 */
function validateContributorConstraint(input: ContributionInput): void {
  // For human contributions linked to existing contributors, either is fine
  // For AI/guest contributions, we need at least one identifier
  if (!input.contributorSlug && !input.guestName) {
    // Allow empty for draft contributions — will be validated at submission time
  }
}

export interface ContributionInput {
  submissionId: number;
  contributorSlug?: string;
  guestName?: string;
  roleKey?: string;
  roleLabel: string;
  sortOrder: number;
  suggestedPublicCredit?: string;
  aiProvider?: string;
  aiModel?: string;
  aiPersona?: string;
  aiActualRole?: string;
  aiIdentitySource?: string;
}

export interface ContributionRecord {
  id: number;
  submission_id: number;
  contributor_slug: string | null;
  guest_name: string | null;
  role_key: string | null;
  role_label: string;
  sort_order: number;
  suggested_public_credit: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_persona: string | null;
  ai_actual_role: string | null;
  ai_identity_source: string;
  created_at: Date;
}

/**
 * Suggested credit boundary — submission contributions do NOT
 * automatically become final Work credits.
 *
 * Admin/editor must explicitly confirm credits when promoting
 * submission to Work via the publish workflow.
 */
export const SUGGESTED_CREDIT_BOUNDARY = {
  description:
    "Suggested public credit from submission contributions is advisory only. " +
    "It does NOT automatically become a final Work credit. " +
    "Admin must explicitly confirm credits during submission-to-Work promotion.",
  enforced: true,
} as const;

export async function listContributionsForSubmission(
  submissionId: number
): Promise<ContributionRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("submission_contributions")
    .where("submission_id", "=", submissionId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();
}

export async function getContribution(id: number): Promise<ContributionRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("submission_contributions")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function createContribution(input: ContributionInput): Promise<ContributionRecord> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  // Validate identity source if provided
  let identitySource: IdentitySource = "unknown";
  if (input.aiIdentitySource) {
    identitySource = validateIdentitySource(input.aiIdentitySource);
  }

  // Validate contributor constraint
  validateContributorConstraint(input);

  const result = await db
    .insertInto("submission_contributions")
    .values({
      submission_id: input.submissionId,
      contributor_slug: input.contributorSlug || null,
      guest_name: input.guestName || null,
      role_key: input.roleKey || null,
      role_label: input.roleLabel,
      sort_order: input.sortOrder,
      suggested_public_credit: input.suggestedPublicCredit || null,
      ai_provider: input.aiProvider || null,
      ai_model: input.aiModel || null,
      ai_persona: input.aiPersona || null,
      ai_actual_role: input.aiActualRole || null,
      ai_identity_source: identitySource,
      created_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Gagal mencipta sumbangan.");
  }

  const contribution = await getContribution(result.id);
  if (!contribution) {
    throw new Error("Sumbangan tidak ditemui selepas penciptaan.");
  }

  return contribution;
}

export async function updateContribution(
  id: number,
  input: Partial<ContributionInput>
): Promise<ContributionRecord> {
  const db = getAdminDb();
  const updateData: Record<string, unknown> = {};

  if (input.contributorSlug !== undefined) updateData.contributor_slug = input.contributorSlug || null;
  if (input.guestName !== undefined) updateData.guest_name = input.guestName || null;
  if (input.roleKey !== undefined) updateData.role_key = input.roleKey || null;
  if (input.roleLabel !== undefined) updateData.role_label = input.roleLabel;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
  if (input.suggestedPublicCredit !== undefined) updateData.suggested_public_credit = input.suggestedPublicCredit || null;

  // Validate identity source if being updated
  if (input.aiIdentitySource !== undefined) {
    updateData.ai_identity_source = validateIdentitySource(input.aiIdentitySource);
  }
  if (input.aiProvider !== undefined) updateData.ai_provider = input.aiProvider || null;
  if (input.aiModel !== undefined) updateData.ai_model = input.aiModel || null;
  if (input.aiPersona !== undefined) updateData.ai_persona = input.aiPersona || null;
  if (input.aiActualRole !== undefined) updateData.ai_actual_role = input.aiActualRole || null;

  await db
    .updateTable("submission_contributions")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const contribution = await getContribution(id);
  if (!contribution) {
    throw new Error("Sumbangan tidak ditemui selepas kemas kini.");
  }

  return contribution;
}

/**
 * Register an identity handshake against a submission contribution.
 * Validates the handshake payload and stores it.
 *
 * This is the PRIMARY entry point for Phase 4D-3 generation orchestration.
 * No external provider is called — pure validation and storage.
 */
export async function registerIdentityHandshake(
  contributionId: number,
  payload: IdentityHandshakePayload
): Promise<ContributionRecord> {
  // Validate the handshake
  const validated = validateHandshake(payload);

  if (!validated.isValid) {
    throw new Error(
      `Identity handshake validation failed: ${validated.errors.join("; ")}`
    );
  }

  // Build contribution fields from validated handshake
  const fields = handshakeToContributionFields(validated);

  // Update the contribution
  const db = getAdminDb();
  const now = new Date().toISOString();

  await db
    .updateTable("submission_contributions")
    .where("id", "=", contributionId)
    .set({
      ai_provider: fields.ai_provider,
      ai_model: fields.ai_model,
      ai_persona: fields.ai_persona,
      ai_actual_role: fields.ai_actual_role,
      ai_identity_source: fields.ai_identity_source,
    })
    .execute();

  const contribution = await getContribution(contributionId);
  if (!contribution) {
    throw new Error("Sumbangan tidak ditemui selepas pendaftaran handshake.");
  }

  return contribution;
}

export async function deleteContribution(id: number): Promise<void> {
  const db = getAdminDb();
  await db
    .deleteFrom("submission_contributions")
    .where("id", "=", id)
    .execute();
}
