/**
 * Admin Credit Service
 *
 * Database operations for managing work credits in admin console.
 * Handles per-work credit assignments with flexible roles.
 */

import { Kysely } from "kysely";
import { getDb, hasDb } from "../db";
import type { Database } from "../db/types";

function getAdminDb(): Kysely<Database> {
  if (!hasDb()) {
    throw new Error("[CreditService] Database not available.");
  }
  return getDb();
}

export interface CreditInput {
  workId: string;
  contributorSlug?: string;
  guestName?: string;
  roleLabel: string;
  byline: boolean;
  isPublic: boolean;
  sortOrder: number;
}

export interface CreditRecord {
  id: number;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: Date;
}

/**
 * List all credits for a work.
 */
export async function listCreditsForWork(workId: string): Promise<CreditRecord[]> {
  const db = getAdminDb();
  return db
    .selectFrom("credits")
    .where("work_id", "=", workId)
    .orderBy("sort_order", "asc")
    .selectAll()
    .execute();
}

/**
 * Get a single credit by ID.
 */
export async function getCredit(id: number): Promise<CreditRecord | undefined> {
  const db = getAdminDb();
  return db
    .selectFrom("credits")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Create a new credit.
 * Enforces XOR: exactly one of contributorSlug or guestName must be provided.
 */
export async function createCredit(input: CreditInput): Promise<CreditRecord> {
  const db = getAdminDb();

  // Enforce XOR: exactly one of contributorSlug or guestName
  if (!input.contributorSlug && !input.guestName) {
    throw new Error("Must provide either contributor or guest name.");
  }
  if (input.contributorSlug && input.guestName) {
    throw new Error("Cannot provide both contributor and guest name.");
  }

  // If contributorSlug provided, verify it exists
  if (input.contributorSlug) {
    const contributor = await db
      .selectFrom("contributors")
      .where("slug", "=", input.contributorSlug)
      .select("slug")
      .executeTakeFirst();

    if (!contributor) {
      throw new Error(`Contributor "${input.contributorSlug}" not found.`);
    }
  }

  const now = new Date().toISOString();

  const result = await db
    .insertInto("credits")
    .values({
      work_id: input.workId,
      contributor_slug: input.contributorSlug || null,
      guest_name: input.guestName || null,
      role_label: input.roleLabel,
      byline: input.byline,
      is_public: input.isPublic,
      sort_order: input.sortOrder,
      created_at: now,
    })
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    throw new Error("Failed to create credit.");
  }

  const credit = await getCredit(result.id);
  if (!credit) {
    throw new Error("Credit not found after creation.");
  }

  return credit;
}

/**
 * Update an existing credit.
 */
export async function updateCredit(
  id: number,
  input: Partial<CreditInput>
): Promise<CreditRecord> {
  const db = getAdminDb();

  // Validate: must have either contributorSlug or guestName
  if (input.contributorSlug === undefined && input.guestName === undefined) {
    // No change to contributor/guest, skip validation
  } else if (!input.contributorSlug && !input.guestName) {
    throw new Error("Must provide either contributor or guest name.");
  }

  // If contributorSlug provided, verify it exists
  if (input.contributorSlug) {
    const contributor = await db
      .selectFrom("contributors")
      .where("slug", "=", input.contributorSlug)
      .select("slug")
      .executeTakeFirst();

    if (!contributor) {
      throw new Error(`Contributor "${input.contributorSlug}" not found.`);
    }
  }

  const updateData: Record<string, unknown> = {};

  if (input.contributorSlug !== undefined) updateData.contributor_slug = input.contributorSlug || null;
  if (input.guestName !== undefined) updateData.guest_name = input.guestName || null;
  if (input.roleLabel !== undefined) updateData.role_label = input.roleLabel;
  if (input.byline !== undefined) updateData.byline = input.byline;
  if (input.isPublic !== undefined) updateData.is_public = input.isPublic;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  await db
    .updateTable("credits")
    .where("id", "=", id)
    .set(updateData)
    .execute();

  const credit = await getCredit(id);
  if (!credit) {
    throw new Error("Credit not found after update.");
  }

  return credit;
}

/**
 * Delete a credit.
 */
export async function deleteCredit(id: number): Promise<void> {
  const db = getAdminDb();

  await db
    .deleteFrom("credits")
    .where("id", "=", id)
    .execute();
}

/**
 * Reorder credits for a work.
 * Uses a single transaction to ensure atomicity.
 * Normalizes sort_order to sequential values (1, 2, 3...).
 */
export async function reorderCredits(
  workId: string,
  creditIds: number[]
): Promise<CreditRecord[]> {
  const db = getAdminDb();

  // Validate: all IDs must exist and belong to same work
  const existingCredits = await db
    .selectFrom("credits")
    .where("work_id", "=", workId)
    .select("id")
    .execute();

  const existingIds = new Set(existingCredits.map((c) => c.id));

  // Check all provided IDs exist
  for (const id of creditIds) {
    if (!existingIds.has(id)) {
      throw new Error(`Credit ${id} not found in work ${workId}.`);
    }
  }

  // Check no duplicates
  const uniqueIds = new Set(creditIds);
  if (uniqueIds.size !== creditIds.length) {
    throw new Error("Duplicate credit IDs in reorder request.");
  }

  // Use transaction for atomicity
  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < creditIds.length; i++) {
      await trx
        .updateTable("credits")
        .where("id", "=", creditIds[i])
        .where("work_id", "=", workId)
        .set({ sort_order: i + 1 })
        .execute();
    }
  });

  // Return updated list
  return listCreditsForWork(workId);
}
